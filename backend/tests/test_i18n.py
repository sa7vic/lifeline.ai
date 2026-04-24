import unittest

from i18n import choose_locale, translate


class I18nTests(unittest.TestCase):
    def test_choose_locale_from_accept_language(self):
        locale = choose_locale("fr-FR;q=0.9, hi-IN;q=0.8, en;q=0.7")
        self.assertEqual(locale, "hi")

    def test_choose_locale_falls_back_to_english(self):
        locale = choose_locale("fr-FR, de-DE;q=0.9")
        self.assertEqual(locale, "en")

    def test_translate_uses_requested_locale(self):
        text = translate("errors.unauthorized", locale="ar")
        self.assertNotEqual(text, "errors.unauthorized")
        self.assertIn("غير", text)

    def test_translate_interpolates_variables(self):
        text = translate("chat.unavailable", locale="en", reason="timeout")
        self.assertIn("timeout", text)


if __name__ == "__main__":
    unittest.main()
