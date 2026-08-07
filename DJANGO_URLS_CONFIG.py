# Django URL Configuration
# File: urls.py (in your Django app or project)

from django.urls import path
from . import views

urlpatterns = [
    # ... other endpoints ...
    
    # Save Strategy Endpoint
    path('api/save-strategy', views.save_strategy, name='save_strategy'),
    
    # ... other endpoints ...
]

# If you're using a project-level urls.py, include your app URLs:
# from django.urls import path, include
#
# urlpatterns = [
#     path('', include('your_app.urls')),
# ]
