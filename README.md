# GetX Starter — Flutter Clean Architecture

A production-ready Flutter starter project using **GetX** for state management and navigation, **Firebase Authentication** for auth, and **Clean Architecture** for a scalable, testable codebase.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Folder Structure](#project-folder-structure)
3. [Layer Responsibilities](#layer-responsibilities)
4. [Auth Flow — Step by Step](#auth-flow--step-by-step)
5. [Environment Setup (Credentials)](#environment-setup-credentials)
6. [How to Run](#how-to-run)
7. [Adding a New Screen — Step-by-Step Guide](#adding-a-new-screen--step-by-step-guide)
8. [Testing Guide](#testing-guide)

---

## Tech Stack

| Package | Purpose |
|---|---|
| `get` | State management, navigation, dependency injection |
| `firebase_core` | Firebase initialization |
| `firebase_auth` | Email/password authentication |
| `dartz` | Functional programming — `Either<Failure, T>` for error handling |
| `equatable` | Value equality for entities and failures |
| `dio` | HTTP client (ready for REST API calls) |

---

## Project Folder Structure

```
lib/
│
├── main.dart                          # App entry point
│
├── core/                              # Shared app-wide utilities
│   ├── constants/                     # App-wide constants (colors, strings, etc.)
│   ├── errors/
│   │   └── failures.dart              # Typed failure classes (AuthFailure, etc.)
│   ├── network/                       # Network configuration (Dio, interceptors)
│   ├── theme/                         # App theme, colors, text styles
│   └── utils/                         # Helper functions and extensions
│
├── domain/                            # ★ Pure Dart — NO Flutter, NO Firebase
│   ├── entities/
│   │   └── user_entity.dart           # Core User object (uid, email, displayName)
│   ├── repositories/
│   │   └── auth_repository.dart       # Abstract contract the data layer must fulfil
│   └── usecases/
│       ├── login_usecase.dart         # Calls repository.login()
│       └── register_usecase.dart      # Calls repository.register()
│
├── data/                              # Implements domain contracts with real services
│   ├── models/
│   │   └── user_model.dart            # Extends UserEntity; maps Firebase User → entity
│   ├── datasources/
│   │   ├── local/                     # Local storage (SharedPrefs, Hive, etc.)
│   │   └── remote/
│   │       └── auth_remote_datasource.dart  # Direct FirebaseAuth calls
│   └── repositories/
│       └── auth_repository_impl.dart  # Implements AuthRepository; handles errors
│
├── di/
│   └── injection_container.dart       # Registers all dependencies with GetX
│
├── routes/
│   ├── app_routes.dart                # Named route constants ('/login', '/home', …)
│   └── app_pages.dart                 # Maps route names → pages + bindings
│
└── presentation/                      # Everything the user sees
    ├── bindings/
    │   ├── login_binding.dart         # Injects LoginController when /login opens
    │   └── register_binding.dart      # Injects RegisterController when /register opens
    ├── controllers/
    │   ├── login_controller.dart      # Form state, validation, login logic
    │   └── register_controller.dart   # Form state, validation, register logic
    ├── pages/
    │   ├── login/
    │   │   └── login_page.dart        # Email + password sign-in screen
    │   ├── register/
    │   │   └── register_page.dart     # Name + email + password + confirm sign-up
    │   └── home/
    │       └── home_page.dart         # Post-login success screen
    └── widgets/
        ├── app_input_field.dart       # Reusable styled text field
        └── primary_button.dart        # Gradient button with loading state
```

---

## Layer Responsibilities

```
┌─────────────────────────────────────────────┐
│            PRESENTATION LAYER               │  ← Pages, Controllers, Bindings, Widgets
│  What the user sees and interacts with.     │
│  Controllers hold observable state (Rx).    │
└────────────────────┬────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────┐
│              DOMAIN LAYER                   │  ← Entities, Repositories (abstract), UseCases
│  Pure Dart. Business rules live here.       │
│  No Flutter, no Firebase imports.           │
└────────────────────┬────────────────────────┘
                     │ implements
┌────────────────────▼────────────────────────┐
│               DATA LAYER                    │  ← Models, DataSources, Repository Impls
│  Connects to Firebase / REST APIs.          │
│  Maps raw data → domain entities.           │
└─────────────────────────────────────────────┘
```

**Rules that keep the architecture clean:**
- `domain/` never imports from `data/` or `presentation/`
- `presentation/` never imports from `data/` directly — only talks to domain use cases
- Every error is wrapped in `Either<Failure, T>` — no raw exceptions reach the UI

---

## Auth Flow — Step by Step

### Login Flow

```
User taps "Sign In"
        │
        ▼
LoginPage (presentation/pages/login/login_page.dart)
  └── calls controller.login()
        │
        ▼
LoginController (presentation/controllers/login_controller.dart)
  1. Validates the form (email format, password length)
  2. Sets isLoading = true (button shows spinner)
  3. Calls LoginUseCase(email, password)
        │
        ▼
LoginUseCase (domain/usecases/login_usecase.dart)
  └── calls AuthRepository.login(email, password)
        │
        ▼
AuthRepositoryImpl (data/repositories/auth_repository_impl.dart)
  └── calls AuthRemoteDataSource.login(email, password)
        │
        ▼
AuthRemoteDataSource (data/datasources/remote/auth_remote_datasource.dart)
  └── calls FirebaseAuth.signInWithEmailAndPassword()
        │
        ▼
  Firebase returns UserCredential
        │
        ▼
AuthRepositoryImpl maps it:
  ✅ Success → right(UserModel.fromFirebaseUser(user))  → UserEntity
  ❌ Failure → left(AuthFailure("friendly message"))
        │
        ▼
LoginController receives Either<Failure, UserEntity>
  ❌ left(failure) → sets errorMessage.value (shown inline on form)
  ✅ right(user)   → shows green snackbar → Get.offAllNamed('/home')
        │
        ▼
HomePage is shown
```

### Register Flow

Identical pattern to Login, substituting:
- `RegisterPage` → `RegisterController` → `RegisterUseCase` → `AuthRepository.register()`
- FirebaseAuth method: `createUserWithEmailAndPassword()`

---

## Dependency Injection — How It's Wired

`InjectionContainer.init()` is called once in `main()` before `runApp()`.  
It registers everything as **lazy singletons** (created only on first use, kept alive on navigation):

```
AuthRemoteDataSource   ← no dependencies
        ▲
AuthRepositoryImpl     ← depends on AuthRemoteDataSource
        ▲
LoginUseCase           ← depends on AuthRepository
RegisterUseCase        ← depends on AuthRepository
        ▲
LoginController        ← injected by LoginBinding when /login opens
RegisterController     ← injected by RegisterBinding when /register opens
```

A **Binding** is a GetX concept that creates the controller exactly when its page opens and destroys it when the page closes — preventing memory leaks.

---

## Environment Setup (Credentials)

Firebase credentials are **never hardcoded**. They live in `.env` (git-ignored).

```bash
# 1. Copy the template
cp .env.example .env

# 2. Fill in your values from Firebase Console
#    https://console.firebase.google.com
```

The app reads credentials via `--dart-define` flags at build/run time (see `.env.example` for all keys).

---

## How to Run

```bash
# Install dependencies
flutter pub get

# Run with Firebase credentials injected
flutter run \
  --dart-define=FIREBASE_PROJECT_ID=your-project-id \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=your-sender-id \
  --dart-define=FIREBASE_STORAGE_BUCKET=your-bucket \
  --dart-define=FIREBASE_WEB_API_KEY=your-web-key \
  --dart-define=FIREBASE_WEB_APP_ID=your-web-app-id \
  --dart-define=FIREBASE_WEB_AUTH_DOMAIN=your-auth-domain \
  --dart-define=FIREBASE_ANDROID_API_KEY=your-android-key \
  --dart-define=FIREBASE_ANDROID_APP_ID=your-android-app-id \
  --dart-define=FIREBASE_IOS_API_KEY=your-ios-key \
  --dart-define=FIREBASE_IOS_APP_ID=your-ios-app-id \
  --dart-define=FIREBASE_IOS_CLIENT_ID=your-ios-client-id \
  --dart-define=FIREBASE_IOS_ANDROID_CLIENT_ID=your-ios-android-client-id \
  --dart-define=FIREBASE_IOS_BUNDLE_ID=your-bundle-id \
  --dart-define=FIREBASE_IOS_REVERSED_CLIENT_ID=your-reversed-client-id
```

---

## Adding a New Screen — Step-by-Step Guide

This guide uses a **Profile Screen** as a real example. Every screen follows the exact same 6-step checklist, regardless of complexity.

---

### The 6-Step Checklist

```
Step 1: Create the UseCase    (domain/usecases/)
Step 2: Register it in DI     (di/injection_container.dart)
Step 3: Create the Controller (presentation/controllers/)
Step 4: Create the Binding    (presentation/bindings/)
Step 5: Create the Page       (presentation/pages/)
Step 6: Register the Route    (routes/app_routes.dart + app_pages.dart)
```

---

### Example: Adding a Profile Screen

#### Step 1 — Create the UseCase

> Only needed if the screen calls business logic. For display-only screens you can skip this and call the repository directly from the controller.

**`lib/domain/usecases/get_profile_usecase.dart`**
```dart
import 'package:getx_starter/domain/entities/user_entity.dart';
import 'package:getx_starter/domain/repositories/auth_repository.dart';

class GetProfileUseCase {
  final AuthRepository repository;
  const GetProfileUseCase(this.repository);

  UserEntity? call() => repository.getCurrentUser();
}
```

---

#### Step 2 — Register in DI

Open `lib/di/injection_container.dart` and add your use case inside `init()`:

```dart
// Add the import at the top
import 'package:getx_starter/domain/usecases/get_profile_usecase.dart';

// Add inside init()
Get.lazyPut<GetProfileUseCase>(
  () => GetProfileUseCase(Get.find<AuthRepository>()),
  fenix: true,
);
```

---

#### Step 3 — Create the Controller

**`lib/presentation/controllers/profile_controller.dart`**
```dart
import 'package:get/get.dart';
import 'package:getx_starter/domain/entities/user_entity.dart';
import 'package:getx_starter/domain/usecases/get_profile_usecase.dart';

class ProfileController extends GetxController {
  final GetProfileUseCase getProfileUseCase;
  ProfileController(this.getProfileUseCase);

  // Observable state — Obx() in the page reacts to changes here
  final Rx<UserEntity?> user = Rx(null);

  @override
  void onInit() {
    super.onInit();
    user.value = getProfileUseCase(); // load on page open
  }
}
```

---

#### Step 4 — Create the Binding

**`lib/presentation/bindings/profile_binding.dart`**
```dart
import 'package:get/get.dart';
import 'package:getx_starter/domain/usecases/get_profile_usecase.dart';
import 'package:getx_starter/presentation/controllers/profile_controller.dart';

class ProfileBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ProfileController>(
      () => ProfileController(Get.find<GetProfileUseCase>()),
    );
  }
}
```

---

#### Step 5 — Create the Page

**`lib/presentation/pages/profile/profile_page.dart`**
```dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_starter/presentation/controllers/profile_controller.dart';

// GetView<T> gives you `controller` for free — no Get.find() needed
class ProfilePage extends GetView<ProfileController> {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Obx(() {
        final user = controller.user.value;
        if (user == null) return const Center(child: Text('Not logged in'));
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('UID: ${user.uid}'),
              Text('Email: ${user.email ?? '-'}'),
            ],
          ),
        );
      }),
    );
  }
}
```

---

#### Step 6 — Register the Route

**`lib/routes/app_routes.dart`** — add the constant:
```dart
abstract class AppRoutes {
  static const login    = '/login';
  static const register = '/register';
  static const home     = '/home';
  static const profile  = '/profile';  // ← add this
}
```

**`lib/routes/app_pages.dart`** — add the GetPage entry:
```dart
// Add imports at the top
import 'package:getx_starter/presentation/bindings/profile_binding.dart';
import 'package:getx_starter/presentation/pages/profile/profile_page.dart';

// Add inside the routes list
GetPage(
  name: AppRoutes.profile,
  page: () => const ProfilePage(),
  binding: ProfileBinding(),
),
```

---

#### Navigating to Your New Screen

```dart
// Go to profile (keeps previous route in stack)
Get.toNamed(AppRoutes.profile);

// Go to profile and remove current page from stack
Get.offNamed(AppRoutes.profile);

// Go to profile and clear the entire navigation stack
Get.offAllNamed(AppRoutes.profile);
```

---

### Quick Reference — Files to create/edit per screen

| What | File | Action |
|---|---|---|
| Use case | `domain/usecases/your_usecase.dart` | **Create** |
| DI registration | `di/injection_container.dart` | **Edit** — add `Get.lazyPut` |
| Controller | `presentation/controllers/your_controller.dart` | **Create** |
| Binding | `presentation/bindings/your_binding.dart` | **Create** |
| Page | `presentation/pages/your_feature/your_page.dart` | **Create** |
| Route name | `routes/app_routes.dart` | **Edit** — add constant |
| Route entry | `routes/app_pages.dart` | **Edit** — add `GetPage` |

> 💡 **Tip:** For simple screens that don't call any API or business logic (e.g. a static "About" page), you can skip Steps 1 & 2 entirely and create just the page + binding + route entry (Steps 4–6), with the controller holding only UI state.

---

## Testing Guide

This project uses **three layers of testing** that mirror the clean architecture layers.  
All tests live under `test/` and use [`mockito`](https://pub.dev/packages/mockito) for mocking.

---

### Test Folder Structure

```
test/
├── mocks/
│   ├── mocks.dart          ← declare @GenerateMocks here
│   └── mocks.mocks.dart    ← auto-generated (never edit by hand)
│
├── unit/
│   ├── domain/
│   │   └── usecases/
│   │       ├── login_usecase_test.dart
│   │       └── register_usecase_test.dart
│   ├── data/
│   │   └── repositories/
│   │       └── auth_repository_impl_test.dart
│   └── presentation/
│       └── controllers/
│           ├── login_controller_test.dart
│           └── register_controller_test.dart
│
└── widget/
    ├── login_page_test.dart
    ├── register_page_test.dart
    └── home_page_test.dart
```

| Folder | What it tests |
|---|---|
| `unit/domain/usecases/` | Use cases delegate correctly to repository, `Either` results pass through unchanged |
| `unit/data/repositories/` | Repository maps Firebase exceptions to typed `Failure`s, handles null users |
| `unit/presentation/controllers/` | Validators, observable state, business logic (no widget tree needed) |
| `widget/` | Pages render correctly, forms validate, interactions trigger the right state changes |

---

### Running Tests

```bash
# Run all unit tests
flutter test test/unit/

# Run all widget tests
flutter test test/widget/

# Run everything
flutter test test/unit/ test/widget/

# Run a single test file
flutter test test/unit/domain/usecases/login_usecase_test.dart

# Run only tests whose name contains a keyword
flutter test test/unit/ --name "validateEmail"

# Run with verbose output (see each test name as it runs)
flutter test test/unit/ test/widget/ --reporter expanded
```

---

### How Mocking Works

This project uses **mockito with code generation**. The workflow is:

```
mocks/mocks.dart          ← you declare which classes to mock
        │
        │  flutter pub run build_runner build
        ▼
mocks/mocks.mocks.dart    ← generated mock classes (MockLoginUseCase, etc.)
        │
        │  imported by test files
        ▼
test files                ← use mock classes in setUp/tests
```

#### Step 1 — Declare the mock in `test/mocks/mocks.dart`

Open `test/mocks/mocks.dart` and add your class to the `@GenerateMocks` list:

```dart
// test/mocks/mocks.dart
@GenerateMocks([
  AuthRepository,
  AuthRemoteDataSource,
  LoginUseCase,
  RegisterUseCase,
  UserCredential,
  User,
  YourNewClass,    // ← add yours here
])
void main() {}
```

Make sure you also add the corresponding `import` at the top of the file.

#### Step 2 — Regenerate the mock file

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

This creates/updates `test/mocks/mocks.mocks.dart` with a `MockYourNewClass` class you can use in tests.

> ⚠️ **Always re-run build_runner** after changing `mocks.dart` or the mock file will be out of date.

#### Step 3 — Use the mock in your test

```dart
import '../../mocks/mocks.mocks.dart';   // adjust path depth as needed

late MockYourNewClass mockYourClass;

setUp(() {
  mockYourClass = MockYourNewClass();
});

test('does the right thing', () {
  // Arrange — define what the mock returns
  when(mockYourClass.doSomething(any)).thenReturn('fake value');

  // Act
  final result = mockYourClass.doSomething('input');

  // Assert
  expect(result, 'fake value');
  verify(mockYourClass.doSomething('input')).called(1);
});
```

**Common mockito matchers:**

| Matcher | Meaning |
|---|---|
| `any` | Accept any argument of the correct type |
| `anyNamed('x')` | Accept any value for a named parameter `x` |
| `argThat(predicate)` | Accept arguments matching a custom condition |

**Common mockito stubbing:**

```dart
// Synchronous return
when(mock.method(any)).thenReturn('value');

// Async return
when(mock.method(any)).thenAnswer((_) async => 'value');

// Throw an exception
when(mock.method(any)).thenThrow(Exception('boom'));

// Return Either<Failure, T> (dartz)
when(mock.method(any)).thenAnswer((_) async => right(someValue));
when(mock.method(any)).thenAnswer((_) async => left(AuthFailure('msg')));
```

---

### Adding a New Test — Step-by-Step

This walkthrough adds tests for a hypothetical `GetProfileUseCase` and its controller.

---

#### Step 1 — Declare mock (if new class needing mocking)

If your new class (`GetProfileUseCase`) is not yet mocked, add it:

```dart
// test/mocks/mocks.dart
@GenerateMocks([
  ...existing...,
  GetProfileUseCase,   // ← add
])
void main() {}
```

Then regenerate:
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

---

#### Step 2 — Write the use case unit test

Create `test/unit/domain/usecases/get_profile_usecase_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/domain/entities/user_entity.dart';
import 'package:getx_starter/domain/usecases/get_profile_usecase.dart';

import '../../../mocks/mocks.mocks.dart'; // adjust depth: test/unit/domain/usecases/ → 3 levels

void main() {
  late GetProfileUseCase sut;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    sut = GetProfileUseCase(mockRepository);
  });

  group('GetProfileUseCase', () {
    test('returns user when one is signed in', () {
      // Arrange — set up mock data
      const fakeUser = UserEntity(uid: 'uid-123', email: 'user@test.com');
      when(mockRepository.getCurrentUser()).thenReturn(fakeUser);

      // Act
      final result = sut();

      // Assert
      expect(result, fakeUser);
      verify(mockRepository.getCurrentUser()).called(1);
    });

    test('returns null when no user is signed in', () {
      when(mockRepository.getCurrentUser()).thenReturn(null);

      final result = sut();

      expect(result, isNull);
    });
  });
}
```

---

#### Step 3 — Write the controller unit test

Create `test/unit/presentation/controllers/profile_controller_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/domain/entities/user_entity.dart';
import 'package:getx_starter/presentation/controllers/profile_controller.dart';

import '../../../../mocks/mocks.mocks.dart'; // 4 levels deep

void main() {
  late ProfileController sut;
  late MockGetProfileUseCase mockUseCase;

  setUp(() {
    mockUseCase = MockGetProfileUseCase();
    sut = ProfileController(mockUseCase);
    Get.testMode = true;
  });

  tearDown(() {
    sut.onClose();
    Get.reset();
  });

  test('loads user into observable on init', () {
    const fakeUser = UserEntity(uid: 'uid-123', email: 'user@test.com');
    when(mockUseCase()).thenReturn(fakeUser);

    sut.onInit(); // triggers the usecase call

    expect(sut.user.value, fakeUser);
  });

  test('user is null when not signed in', () {
    when(mockUseCase()).thenReturn(null);

    sut.onInit();

    expect(sut.user.value, isNull);
  });
}
```

---

#### Step 4 — Write the widget test

Create `test/widget/profile_page_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/domain/entities/user_entity.dart';
import 'package:getx_starter/presentation/controllers/profile_controller.dart';
import 'package:getx_starter/presentation/pages/profile/profile_page.dart';

import '../mocks/mocks.mocks.dart'; // 1 level deep from test/widget/

void main() {
  late MockGetProfileUseCase mockUseCase;
  late ProfileController controller;

  setUp(() {
    mockUseCase = MockGetProfileUseCase();
    controller = ProfileController(mockUseCase);
  });

  tearDown(() => Get.reset());

  testWidgets('displays user email when signed in', (tester) async {
    // Arrange — fake data the use case will return
    const fakeUser = UserEntity(uid: 'uid-123', email: 'user@test.com');
    when(mockUseCase()).thenReturn(fakeUser);

    // Put controller into GetX before pumpWidget
    Get.put<ProfileController>(controller);
    controller.onInit();

    // Act
    await tester.pumpWidget(const GetMaterialApp(home: ProfilePage()));
    await tester.pump();

    // Assert
    expect(find.text('Email: user@test.com'), findsOneWidget);
  });

  testWidgets('displays fallback when not signed in', (tester) async {
    when(mockUseCase()).thenReturn(null);

    Get.put<ProfileController>(controller);
    controller.onInit();

    await tester.pumpWidget(const GetMaterialApp(home: ProfilePage()));
    await tester.pump();

    expect(find.text('Not logged in'), findsOneWidget);
  });
}
```

---

### Import Path Cheat Sheet

The path to `test/mocks/mocks.mocks.dart` depends on how deep your test file is:

| Test file location | Import path |
|---|---|
| `test/widget/your_test.dart` | `'../mocks/mocks.mocks.dart'` |
| `test/unit/*/your_test.dart` | `'../../mocks/mocks.mocks.dart'` |
| `test/unit/*/*/your_test.dart` | `'../../../mocks/mocks.mocks.dart'` |
| `test/unit/*/*/*/your_test.dart` | `'../../../../mocks/mocks.mocks.dart'` |

> 💡 `../` means go up one directory level. Count your depth from `test/` and add that many `../`.

---

### Test Checklist — Adding Tests for a New Feature

```
☐ 1. Declare mock in test/mocks/mocks.dart (if new class)
☐ 2. Run: flutter pub run build_runner build --delete-conflicting-outputs
☐ 3. Create unit test for use case   (test/unit/domain/usecases/)
☐ 4. Create unit test for controller (test/unit/presentation/controllers/)
☐ 5. Create widget test for page     (test/widget/)
☐ 6. Run: flutter test test/unit/ test/widget/
☐ 7. All tests green ✅
```
