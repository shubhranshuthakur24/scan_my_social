import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_starter/core/utils/app_logger.dart';
import 'package:getx_starter/features/auth/domain/usecases/register_usecase.dart';
import 'package:getx_starter/routes/app_routes.dart';

class RegisterController extends GetxController {
  final RegisterUseCase registerUseCase;

  RegisterController(this.registerUseCase);

  static const _tag = 'RegisterController';

  // Form key
  final formKey = GlobalKey<FormState>();

  // Text controllers
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  // Observable state
  final isLoading = false.obs;
  final isPasswordHidden = true.obs;
  final isConfirmPasswordHidden = true.obs;
  final errorMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();
    AppLogger.info('RegisterController initialised', tag: _tag);
  }

  @override
  void onClose() {
    AppLogger.info('RegisterController disposed', tag: _tag);
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.onClose();
  }

  void togglePasswordVisibility() {
    isPasswordHidden.value = !isPasswordHidden.value;
    AppLogger.verbose(
      'Password visibility toggled → hidden: ${isPasswordHidden.value}',
      tag: _tag,
    );
  }

  void toggleConfirmPasswordVisibility() {
    isConfirmPasswordHidden.value = !isConfirmPasswordHidden.value;
    AppLogger.verbose(
      'Confirm password visibility toggled → hidden: ${isConfirmPasswordHidden.value}',
      tag: _tag,
    );
  }

  Future<void> register() async {
    errorMessage.value = '';

    if (!formKey.currentState!.validate()) {
      AppLogger.debug(
        'Form validation failed — aborting registration',
        tag: _tag,
      );
      return;
    }

    AppLogger.info(
      'Registration initiated for: ${emailController.text.trim()}',
      tag: _tag,
    );
    isLoading.value = true;

    final result = await registerUseCase(
      emailController.text.trim(),
      passwordController.text.trim(),
    );

    isLoading.value = false;

    result.fold(
      (failure) {
        AppLogger.warning('Registration failed: ${failure.message}', tag: _tag);
        errorMessage.value = failure.message;
      },
      (user) {
        AppLogger.info(
          'Registration success → navigating to home (uid: ${user.uid})',
          tag: _tag,
        );
        Get.snackbar(
          'Account created!',
          'Welcome, ${user.email ?? 'new user'}',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.green.shade600,
          colorText: Colors.white,
          margin: const EdgeInsets.all(16),
          borderRadius: 12,
          duration: const Duration(seconds: 3),
        );
        Get.offAllNamed(AppRoutes.home);
      },
    );
  }

  // ── Validators ──────────────────────────────────────────────────────────

  String? validateName(String? value) {
    if (value == null || value.trim().isEmpty) return 'Name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return null;
  }

  String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) return 'Email is required';
    if (!GetUtils.isEmail(value.trim())) return 'Enter a valid email address';
    return null;
  }

  String? validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  String? validateConfirmPassword(String? value) {
    if (value == null || value.isEmpty) return 'Please confirm your password';
    if (value != passwordController.text) return 'Passwords do not match';
    return null;
  }
}
