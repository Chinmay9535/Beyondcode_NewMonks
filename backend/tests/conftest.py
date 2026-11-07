import os
import sys
from pathlib import Path

import pytest

# Isolated database and offline mode for every test run.
_DB = Path(__file__).parent / "_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["LLM_PROVIDER"] = "none"
os.environ["SEED_DEMO_DATA"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture(scope="session")
def client():
    if _DB.exists():
        _DB.unlink()
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
    _DB.unlink(missing_ok=True)


@pytest.fixture(scope="session")
def staff(client):
    tok = client.post("/api/staff/login", json={"pin": "2468"}).json()["token"]
    return {"Authorization": f"Bearer {tok}"}
