# BM Booking — Flutter mobile app

A fresh mobile-first UI for the BM Booking healthcare portal. It talks to the same
live API as the web app.

## Screens in this first version

- Role-aware sign-in: Patient / Doctor (phone + OTP), Hospital / Admin (password)
- Home: greeting, hero, quick actions, searchable doctor list from `/doctors/all`
- Bookings: appointments from `/appointments/my`
- Equipment: placeholder screen (next roadmap item)
- Profile: account details and sign out

## Configuration

The API URL is compiled in via `--dart-define` (defaults to the live API):

```bash
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://bmbookingapi.possibletechplc.com/api
```

To point at another backend, change that value and rebuild.

## Local build

Requires Flutter 3.50.1 (stable), JDK 17, and Android SDK platform/build-tools.

```bash
flutter pub get
flutter analyze
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`.

The Android platform folder is generated with `flutter create --org com.possibletech
--project-name bm_booking_app .` from this directory if it is missing.

## Cloud build

Pushing the `mobile/` folder triggers `.github/workflows/flutter-aab.yml`, which
builds the AAB on GitHub Actions and uploads it as an artifact.
