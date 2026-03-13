import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_starter/core/utils/app_logger.dart';
import 'package:getx_starter/features/auth/domain/usecases/login_usecase.dart';
import 'package:getx_starter/routes/app_routes.dart';

class LoginController extends GetxController {
  final LoginUseCase loginUseCase;

  LoginController(this.loginUseCase);

  static const _tag = 'LoginController';

  // Form key for validation
  final formKey = GlobalKey<FormState>();

  // Text controllers
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  // Observable state
  final isLoading = false.obs;
  final isPasswordHidden = true.obs;
  final errorMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();
    AppLogger.info('LoginController initialised', tag: _tag);
  }

  @override
  void onClose() {
    AppLogger.info('LoginController disposed', tag: _tag);
    emailController.dispose();
    passwordController.dispose();
    super.onClose();
  }

  void togglePasswordVisibility() {
    isPasswordHidden.value = !isPasswordHidden.value;
    AppLogger.verbose(
      'Password visibility toggled → hidden: ${isPasswordHidden.value}',
      tag: _tag,
    );
  }

  Future<void> login() async {
    // Clear previous error
    errorMessage.value = '';

    if (!formKey.currentState!.validate()) {
      AppLogger.debug('Form validation failed — aborting login', tag: _tag);
      return;
    }

    AppLogger.info(
      'Login initiated for: ${emailController.text.trim()}',
      tag: _tag,
    );
    isLoading.value = true;

    final result = await loginUseCase(
      emailController.text.trim(),
      passwordController.text.trim(),
    );

    isLoading.value = false;

    result.fold(
      (failure) {
        AppLogger.warning('Login failed: ${failure.message}', tag: _tag);
        errorMessage.value = failure.message;
      },
      (user) {
        AppLogger.info(
          'Login success → navigating to home (uid: ${user.uid})',
          tag: _tag,
        );
        Get.snackbar(
          'Welcome back!',
          user.email ?? 'Logged in successfully',
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

  /// Validators
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
}
