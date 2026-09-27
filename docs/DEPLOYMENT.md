# Deployment
This is a Preview integration, not a production release. GitHub Actions builds feature/two-app-ecosystem and main. Download PlayersHype-Ecosystem-V1-Android from the successful workflow run; its root contains both APKs and hashes plus master ZIPs.

For consistent QA upgrades configure QA_KEYSTORE_BASE64, QA_STORE_PASSWORD, QA_KEY_ALIAS and QA_KEY_PASSWORD in GitHub repository Actions Secrets. Use an exclusively QA signing identity. Never commit or include the keystore in ZIPs. With no secrets, CI generates an ephemeral RSA3072 key; SIGNING.txt records the choice. Ephemeral builds may require uninstalling the previous Preview, which removes private local data: export Admin work beforehand.

No Play Store upload, production signing, Core deployment or authenticated publishing was performed. Test installation on a physical Android device and complete the parity matrix before promotion.
