"""Shared validation for user-uploaded image files (avatars, logos)."""
from rest_framework import status
from rest_framework.response import Response

MAX_IMAGE_BYTES = 3 * 1024 * 1024  # 3 MB
ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}


def validate_image(uploaded_file):
    """Return an error Response if invalid, else None."""
    if uploaded_file is None:
        return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
    if uploaded_file.size > MAX_IMAGE_BYTES:
        return Response({'detail': 'Image must be 3 MB or smaller.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if uploaded_file.content_type not in ALLOWED_CONTENT_TYPES:
        return Response({'detail': 'Only JPEG, PNG, WebP, or GIF images are allowed.'},
                        status=status.HTTP_400_BAD_REQUEST)
    return None
