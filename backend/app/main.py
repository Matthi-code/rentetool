"""
Rentetool API - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import cases, berekening, snapshots, usage, sharing

settings = get_settings()

app = FastAPI(
    title="Rentetool API",
    description="Nederlandse wettelijke rente calculator conform Burgerlijk Wetboek",
    version="1.0.0",
)

# CORS middleware - allow Vercel preview URLs
cors_origins = settings.cors_origins + [
    "https://*.vercel.app",  # All Vercel preview deployments
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(berekening.router, prefix="/api", tags=["berekening"])
app.include_router(snapshots.router, prefix="/api/snapshots", tags=["snapshots"])
app.include_router(usage.router)
app.include_router(sharing.router, prefix="/api/sharing", tags=["sharing"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "app": settings.app_name}


@app.get("/api/rentetabel")
async def get_rentetabel():
    """Get the current interest rate table."""
    from app.services.rente_calculator import RENTETABEL

    return [
        {
            "datum": str(datum),
            "wettelijk": float(wet),
            "handels": float(handel)
        }
        for datum, wet, handel in RENTETABEL
    ]
