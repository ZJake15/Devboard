from django.db.models import Avg, Count, Max, Min
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from audit.utils import log_action
from accounts.notify import notify


class IsCompanyAccount(permissions.BasePermission):
    message = 'Company accounts only.'

    def has_permission(self, request, view):
        return bool(
            request.auth and
            request.auth.get('account_type') == 'company'
        )
from .filters import JobFilter
from .models import Application, CompanyRating, Job, SalarySubmission, SavedSearch
from .serializers import (
    ApplicationSerializer,
    CompanyRatingSerializer,
    JobCreateSerializer,
    JobSerializer,
    SalaryBenchmarkSerializer,
    SalarySubmissionSerializer,
    SavedSearchSerializer,
)


class SubmissionThrottle(AnonRateThrottle):
    rate = '5/minute'
    scope = 'submission'


class JobListView(generics.ListAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = JobFilter

    def get_queryset(self):
        return (
            Job.objects.filter(is_active=True)
            .select_related('company')
            .prefetch_related('tech_stack')
        )


class JobDetailView(generics.RetrieveAPIView):
    queryset = Job.objects.select_related('company').prefetch_related('tech_stack')
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        log_action(request, 'job.view', 'Job', kwargs.get('pk'),
                   {'title': response.data.get('title')})
        return response


class JobCreateView(generics.CreateAPIView):
    serializer_class = JobCreateSerializer
    permission_classes = [IsCompanyAccount | permissions.IsAdminUser]

    def perform_create(self, serializer):
        company = self.request.user.company_profile.company
        instance = serializer.save(posted_by=self.request.user, company=company)
        log_action(self.request, 'job.view', 'Job', instance.pk,
                   {'title': instance.title, 'action': 'created'})


class CompanyJobListView(generics.ListAPIView):
    """Jobs posted by the authenticated company account."""
    serializer_class = JobSerializer
    permission_classes = [IsCompanyAccount]
    pagination_class = None

    def get_queryset(self):
        return (
            Job.objects.filter(posted_by=self.request.user)
            .select_related('company')
            .prefetch_related('tech_stack')
        )


class CompanyJobDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsCompanyAccount]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return JobSerializer
        return JobCreateSerializer

    def get_queryset(self):
        return (
            Job.objects.filter(posted_by=self.request.user)
            .select_related('company')
            .prefetch_related('tech_stack')
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request, 'job.view', 'Job', instance.pk,
                   {'title': instance.title, 'action': 'updated'})

    def perform_destroy(self, instance):
        log_action(self.request, 'job.view', 'Job', instance.pk,
                   {'title': instance.title, 'action': 'deleted'})
        instance.delete()


class ReceivedApplicationsView(generics.ListAPIView):
    """All applications submitted to jobs posted by this company."""
    serializer_class = ApplicationSerializer
    permission_classes = [IsCompanyAccount]
    pagination_class = None

    def get_queryset(self):
        return (
            Application.objects
            .filter(job__posted_by=self.request.user)
            .select_related('user', 'job', 'job__company')
            .prefetch_related('job__tech_stack')
            .order_by('-created_at')
        )


class RateApplicantView(APIView):
    """Company submits a 0–100 rating for a developer after working with them."""
    permission_classes = [IsCompanyAccount]

    def post(self, request, pk):
        try:
            app = Application.objects.select_related('job', 'user').get(
                pk=pk, job__posted_by=request.user
            )
        except Application.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if app.status not in ('interview', 'offer'):
            return Response(
                {'detail': 'You can only rate applicants you have approved (interview/offer stage).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = getattr(app, 'company_rating', None)
        serializer = CompanyRatingSerializer(existing, data=request.data, partial=bool(existing))
        if serializer.is_valid():
            rating_obj = serializer.save(application=app)
            log_action(request, 'application.update', 'CompanyRating', rating_obj.pk, {
                'applicant': app.user.username,
                'job': app.job.title,
                'rating': rating_obj.rating,
            })
            return Response(CompanyRatingSerializer(rating_obj).data,
                            status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, pk):
        try:
            app = Application.objects.get(pk=pk, job__posted_by=request.user)
            rating = app.company_rating
            return Response(CompanyRatingSerializer(rating).data)
        except (Application.DoesNotExist, CompanyRating.DoesNotExist):
            return Response({'rating': None})


class ReviewApplicationView(APIView):
    """
    Company reviews an application.
    action=schedule  → status=interview, requires interview_date (ISO datetime)
    action=hire      → status=offer  (immediate hire, no interview)
    action=rejected  → status=rejected
    """
    permission_classes = [IsCompanyAccount]

    def post(self, request, pk):
        try:
            app = Application.objects.select_related('job', 'user').get(
                pk=pk, job__posted_by=request.user
            )
        except Application.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ('schedule', 'hire', 'rejected'):
            return Response(
                {'detail': 'action must be "schedule", "hire", or "rejected".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == 'schedule':
            interview_date = request.data.get('interview_date')
            if not interview_date:
                return Response({'detail': 'interview_date is required for action=schedule.'},
                                status=status.HTTP_400_BAD_REQUEST)
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(interview_date)
            if not parsed:
                return Response({'detail': 'Invalid interview_date format.'},
                                status=status.HTTP_400_BAD_REQUEST)
            app.status = 'interview'
            app.interview_scheduled_at = parsed
            app.interview_notes = request.data.get('interview_notes', '')
            app.save()
            notify(app.user, 'interview_scheduled',
                   f'Interview scheduled for {app.job.title}',
                   f'Your interview at {app.job.company.name} is on {parsed.strftime("%b %d, %Y at %H:%M")}.',
                   link='/pipeline')

        elif action == 'hire':
            app.status = 'offer'
            app.save()
            notify(app.user, 'application_approved',
                   f'🎉 Job offer from {app.job.company.name}!',
                   f'You have been hired for {app.job.title}. Congratulations!',
                   link='/pipeline')

        else:  # rejected
            app.status = 'rejected'
            app.save()

        log_action(request, 'application.update', 'Application', app.pk, {
            'action': action, 'applicant': app.user.username,
            'job': app.job.title, 'new_status': app.status,
        })
        return Response(ApplicationSerializer(app, context={'request': request}).data)


class SalarySubmissionView(generics.CreateAPIView):
    serializer_class = SalarySubmissionSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [SubmissionThrottle]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request, 'salary.submit', 'SalarySubmission', instance.pk,
                   {'role': instance.role, 'location': instance.location,
                    'seniority': instance.seniority})


class SalaryBenchmarkView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        role = request.query_params.get('role', '')
        location = request.query_params.get('location', '')
        seniority = request.query_params.get('seniority', '')

        qs = SalarySubmission.objects.all()
        if role:
            qs = qs.filter(role__icontains=role)
        if location:
            qs = qs.filter(location__icontains=location)
        if seniority:
            qs = qs.filter(seniority=seniority)

        if not qs.exists():
            return Response({'detail': 'No data for these filters.'}, status=status.HTTP_404_NOT_FOUND)

        amounts = sorted(qs.values_list('amount', flat=True))
        n = len(amounts)
        p25 = amounts[int(n * 0.25)]
        p50 = amounts[int(n * 0.50)]
        p75 = amounts[int(n * 0.75)]

        data = {
            'role': role, 'location': location, 'seniority': seniority,
            'count': n, 'min_salary': amounts[0], 'max_salary': amounts[-1],
            'avg_salary': sum(amounts) / n, 'p25': p25, 'p50': p50, 'p75': p75,
        }
        return Response(SalaryBenchmarkSerializer(data).data)


class SavedSearchListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return SavedSearch.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        log_action(self.request, 'saved_search.create', 'SavedSearch', instance.pk,
                   {'name': instance.name})


class SavedSearchDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedSearch.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        log_action(self.request, 'saved_search.delete', 'SavedSearch', instance.pk,
                   {'name': instance.name})
        instance.delete()


class OfferJobView(APIView):
    """Company proactively offers a job to a specific developer by username."""
    permission_classes = [IsCompanyAccount]

    def post(self, request):
        from django.contrib.auth.models import User as DjangoUser
        username = request.data.get('username', '').strip()
        job_id = request.data.get('job_id')

        if not username or not job_id:
            return Response({'detail': 'username and job_id are required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = DjangoUser.objects.get(username=username)
        except DjangoUser.DoesNotExist:
            return Response({'detail': f'Developer "{username}" not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        # Only developer accounts can be offered work (not company accounts)
        if hasattr(target_user, 'company_profile'):
            return Response({'detail': f'"{username}" is a company account, not a developer.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            job = Job.objects.get(pk=job_id, posted_by=request.user)
        except Job.DoesNotExist:
            return Response({'detail': 'Job not found or not owned by you.'},
                            status=status.HTTP_404_NOT_FOUND)

        app, created = Application.objects.get_or_create(
            user=target_user, job=job,
            defaults={'status': 'offer'},
        )
        if not created:
            app.status = 'offer'
            app.save()

        notify(target_user, 'job_offer',
               f'Job offer: {job.title} at {job.company.name}',
               f'{job.company.name} has offered you the position of {job.title}.',
               link='/pipeline')

        log_action(request, 'application.create', 'Application', app.pk,
                   {'offer_to': username, 'job': job.title})
        return Response(ApplicationSerializer(app, context={'request': request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Application.objects.filter(user=self.request.user)
            .select_related('job', 'job__company')
            .prefetch_related('job__tech_stack')
        )

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        log_action(self.request, 'application.create', 'Application', instance.pk,
                   {'job_id': instance.job.pk, 'job_title': instance.job.title,
                    'status': instance.status})
        # Notify the company that someone applied
        if instance.job.posted_by and instance.status == 'applied':
            notify(
                instance.job.posted_by,
                'new_application',
                f'{instance.user.username} applied to {instance.job.title}',
                link='/company/dashboard',
            )


class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request, 'application.update', 'Application', instance.pk,
                   {'job_title': instance.job.title, 'new_status': instance.status})

    def perform_destroy(self, instance):
        log_action(self.request, 'application.delete', 'Application', instance.pk,
                   {'job_title': instance.job.title})
        instance.delete()


class RespondToOfferView(APIView):
    """Developer accepts or declines a job offer; notifies the company."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            app = Application.objects.select_related('job', 'job__company').get(
                pk=pk, user=request.user
            )
        except Application.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if app.status != 'offer':
            return Response({'detail': 'You can only respond to an active job offer.'},
                            status=status.HTTP_400_BAD_REQUEST)

        response_value = request.data.get('response')
        if response_value not in ('accepted', 'declined'):
            return Response({'detail': 'response must be "accepted" or "declined".'},
                            status=status.HTTP_400_BAD_REQUEST)

        app.offer_response = response_value
        if response_value == 'declined':
            app.status = 'rejected'
        app.save()

        # Notify the company that posted the job
        if app.job.posted_by:
            verb = 'accepted' if response_value == 'accepted' else 'declined'
            notify(
                app.job.posted_by,
                'application_approved' if response_value == 'accepted' else 'new_application',
                f'{request.user.username} {verb} your offer for {app.job.title}',
                f'{request.user.username} has {verb} the job offer for {app.job.title}.',
                link='/company/dashboard',
            )

        log_action(request, 'application.update', 'Application', app.pk,
                   {'offer_response': response_value, 'job': app.job.title})
        return Response(ApplicationSerializer(app, context={'request': request}).data)
