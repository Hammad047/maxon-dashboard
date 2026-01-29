"""
Background job scheduler using APScheduler.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.config import settings
from app.services.analytics_service import AnalyticsService
import asyncio

scheduler = AsyncIOScheduler()


async def refresh_analytics_job():
    """Periodic job to refresh analytics from S3."""
    analytics_service = AnalyticsService()
    await analytics_service.get_analytics(force_refresh=True)
    print("Analytics refreshed from S3")


def start_scheduler():
    """Start the background job scheduler."""
    # Schedule analytics refresh
    scheduler.add_job(
        refresh_analytics_job,
        trigger=IntervalTrigger(hours=settings.ANALYTICS_REFRESH_INTERVAL_HOURS),
        id="refresh_analytics",
        name="Refresh Analytics from S3",
        replace_existing=True
    )
    
    scheduler.start()
    print("Background scheduler started")


def shutdown_scheduler():
    """Shutdown the scheduler."""
    scheduler.shutdown()
    print("Background scheduler stopped")
