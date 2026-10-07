"""Run: python -m unittest discover -s tests -p 'test_postmortem_archive.py'"""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_postmortem_archive import build

VALID = {
    "track_id": "camarero", "race_date": "2026-10-07", "race_number": 1,
    "select_number": 4, "official_winner_number": 2,
    "race_start_timestamp": "2026-10-07T14:00:00-04:00",
    "original_publication_timestamp": "2026-10-07T11:00:00-04:00",
    "original_publication_url": "https://example.org/prediction",
    "official_result_url": "https://example.org/result",
    "approved_at": "2026-10-07T17:00:00-04:00",
    "result_verified_at": "2026-10-07T16:00:00-04:00",
    "published_at": "2026-10-07T18:00:00-04:00",
    "reviewed_by": "reviewer", "source_quality": "verified_pre_race",
    "status": "published",
}

class ArchiveTests(unittest.TestCase):
    def test_valid(self):
        out = build({"records": [copy.deepcopy(VALID)]})
        self.assertEqual(len(out["records"]), 1)
        self.assertNotIn("private_notes", out["records"][0])

    def test_draft_rejected(self):
        r = dict(VALID, status="draft")
        with self.assertRaises(ValueError):
            build({"records": [r]})

    def test_partial_rejected(self):
        with self.assertRaises(ValueError):
            build({"records": [dict(VALID, source_quality="partial")]})

    def test_late_prediction_rejected(self):
        with self.assertRaises(ValueError):
            build({"records": [dict(VALID, original_publication_timestamp="2026-10-07T15:00:00-04:00")]})

    def test_missing_result_rejected(self):
        r = copy.deepcopy(VALID)
        del r["official_result_url"]
        with self.assertRaises(ValueError):
            build({"records": [r]})

    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            build({"records": [VALID, copy.deepcopy(VALID)]})

    def test_insecure_evidence_rejected(self):
        with self.assertRaises(ValueError):
            build({"records": [dict(VALID, original_publication_url="http://example.org")]})

    def test_private_fields_not_exported(self):
        r = dict(VALID, private_notes="secret", created_by="admin")
        out = build({"records": [r]})
        self.assertNotIn("private_notes", out["records"][0])
        self.assertNotIn("created_by", out["records"][0])

if __name__ == "__main__":
    unittest.main()
