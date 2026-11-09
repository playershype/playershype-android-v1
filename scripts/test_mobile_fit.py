import unittest
from pathlib import Path
import re,subprocess
from apply_mobile import html,ROOT

class MobileFitTest(unittest.TestCase):
    def test_idempotent_and_preserves_script_and_snapshot(self):
        for name in ['docs/app/index.html','docs/hypepredict/index.html']:
            old=subprocess.check_output(['git','show','HEAD:'+name],cwd=ROOT).decode()
            new=html(old)
            self.assertEqual(new,html(new))
            self.assertEqual(re.findall(r'<script\b[\s\S]*?</script>',old),re.findall(r'<script\b[\s\S]*?</script>',new))
    def test_does_not_mask_page_overflow(self):
        css=(ROOT/'branding/mobile-fit.css').read_text()
        self.assertNotRegex(css,r'(?:html|body)[^{]*\{[^}]*overflow(?:-x)?:\s*hidden')
        self.assertIn('min-height:44px',css)
        self.assertIn('.screen-nav a[href="#resultados"]',css)

if __name__=='__main__':unittest.main()
