"""Regression tests for the published Admin 1.4.2 snapshot storage mismatch."""
import tempfile
import unittest
from pathlib import Path

from patch_admin_workspace_scope import patch_admin_workspace_scope, LEGACY

MODULE = "const STORAGE_SCOPE=SNAPSHOT_ID?"
JS = "(()=>{ " + LEGACY + " function workspace(){return localStorage.getItem(STORAGE_KEY)} })();"

class SnapshotWorkspaceRegressionTests(unittest.TestCase):
    def prepare(self, tmp, snapshot="data-snapshot-id='case_123'"):
        d = Path(tmp)
        admin, publisher, module = (d/x for x in ("admin.html", "live-publish.js", "module.js"))
        admin.write_text("<html lang='es' " + snapshot + "></html>", encoding="utf-8")
        publisher.write_text(JS, encoding="utf-8")
        module.write_text(MODULE, encoding="utf-8")
        return admin, publisher, module

    def test_scoped_editor_and_publisher_share_exact_library(self):
        with tempfile.TemporaryDirectory() as td:
            paths = self.prepare(td)
            suffix = patch_admin_workspace_scope(*paths)
            s = paths[1].read_text()
            self.assertEqual(suffix, ".snapshot.case_123")
            for root in ("hypepredict.cardLibrary.v1", "hypepredict.trackRegistry.v1",
                         "hypepredict.postmortemHistory.v1", "hypepredict.viewerTheme.v1"):
                self.assertIn(root + suffix, s)
            self.assertNotIn(LEGACY, s)

    def test_legacy_unscoped_editor_still_supported(self):
        with tempfile.TemporaryDirectory() as td:
            paths = self.prepare(td, snapshot="")
            self.assertEqual(patch_admin_workspace_scope(*paths), "unscoped")
            self.assertIn(LEGACY, paths[1].read_text())

    def test_invalid_snapshot_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            paths = self.prepare(td, snapshot="data-snapshot-id='*bad*'")
            with self.assertRaisesRegex(RuntimeError, "Malformed"):
                patch_admin_workspace_scope(*paths)

    def test_unexpected_publisher_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            paths = self.prepare(td)
            paths[1].write_text("let changed=true;", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "Expected exactly one"):
                patch_admin_workspace_scope(*paths)

    def test_unexpected_editor_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            paths = self.prepare(td)
            paths[2].write_text("let changed=true;", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "storage contract"):
                patch_admin_workspace_scope(*paths)

if __name__ == "__main__":
    unittest.main()
