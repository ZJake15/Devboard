"""
Ranking system for developer profiles.

Score breakdown:
  +10  per portfolio project  (capped at +50)
  +rating*0.5  per company rating >= 30/100
  -20  per company rating < 30/100  (penalty)
  Minimum total score: 0

Tiers:
  Newcomer  0  – 24
  Bronze   25  – 74
  Silver   75  – 149
  Gold    150  – 249
  Platinum 250+
"""

TIER_THRESHOLDS = [
    (250, 'Platinum', '🏆'),
    (150, 'Gold',     '🥇'),
    (75,  'Silver',   '🥈'),
    (25,  'Bronze',   '🥉'),
    (0,   'Newcomer', '🌱'),
]


def compute_rank(profile) -> dict:
    """Return {score, tier, tier_icon, projects_score, ratings_score, ratings}."""
    from jobs.models import CompanyRating

    project_count = profile.projects.count()
    projects_score = min(project_count * 10, 50)

    company_ratings = list(
        CompanyRating.objects.filter(application__user=profile.user)
        .values_list('rating', flat=True)
    )

    ratings_score = 0
    for r in company_ratings:
        if r >= 30:
            ratings_score += int(r * 0.5)
        else:
            ratings_score -= 20

    total = max(0, projects_score + ratings_score)

    tier, icon = 'Newcomer', '🌱'
    for threshold, name, t_icon in TIER_THRESHOLDS:
        if total >= threshold:
            tier, icon = name, t_icon
            break

    return {
        'score': total,
        'tier': tier,
        'tier_icon': icon,
        'projects_score': projects_score,
        'ratings_score': ratings_score,
        'ratings_received': len(company_ratings),
        'average_rating': round(sum(company_ratings) / len(company_ratings), 1) if company_ratings else None,
    }
