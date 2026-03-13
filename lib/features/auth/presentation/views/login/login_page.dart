import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_starter/features/auth/presentation/controllers/login_controller.dart';
import 'package:getx_starter/features/auth/presentation/views/widgets/app_input_field.dart';
import 'package:getx_starter/features/auth/presentation/views/widgets/primary_button.dart';
import 'package:getx_starter/routes/app_routes.dart';

class LoginPage extends GetView<LoginController> {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F0C29), Color(0xFF302B63), Color(0xFF24243E)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
              child: Form(
                key: controller.formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Header ─────────────────────────────────────────
                    Center(
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF7C6FCD), Color(0xFF4FACFE)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF7C6FCD).withAlpha(120),
                              blurRadius: 24,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.local_fire_department_rounded,
                          size: 38,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    const Text(
                      'Welcome back',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sign in to continue',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white.withAlpha(153),
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 40),

                    // ── Email field ────────────────────────────────────
                    AppInputField(
                      label: 'Email',
                      hint: 'you@example.com',
                      controller: controller.emailController,
                      validator: controller.validateEmail,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 20),

                    // ── Password field ─────────────────────────────────
                    Obx(
                      () => AppInputField(
                        label: 'Password',
                        hint: '••••••••',
                        controller: controller.passwordController,
                        validator: controller.validatePassword,
                        obscureText: controller.isPasswordHidden.value,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => controller.login(),
                        suffixIcon: IconButton(
                          onPressed: controller.togglePasswordVisibility,
                          icon: Icon(
                            controller.isPasswordHidden.value
                                ? Icons.visibility_off_rounded
                                : Icons.visibility_rounded,
                            color: Colors.white54,
                            size: 22,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // ── Forgot password ────────────────────────────────
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Forgot password?',
                          style: TextStyle(
                            color: Color(0xFF7C6FCD),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // ── Error message ──────────────────────────────────
                    Obx(() {
                      if (controller.errorMessage.value.isEmpty) {
                        return const SizedBox.shrink();
                      }
                      return Container(
                        margin: const EdgeInsets.only(bottom: 20),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF6B6B).withAlpha(30),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFFF6B6B).withAlpha(80),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline_rounded,
                              color: Color(0xFFFF6B6B),
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                controller.errorMessage.value,
                                style: const TextStyle(
                                  color: Color(0xFFFF6B6B),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),

                    // ── Login button ───────────────────────────────────
                    Obx(
                      () => PrimaryButton(
                        label: 'Sign In',
                        isLoading: controller.isLoading.value,
                        onPressed: controller.isLoading.value
                            ? null
                            : controller.login,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // ── Divider ────────────────────────────────────────
                    Row(
                      children: [
                        Expanded(
                          child: Divider(
                            color: Colors.white.withAlpha(30),
                            height: 1,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'or',
                            style: TextStyle(
                              color: Colors.white.withAlpha(102),
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Divider(
                            color: Colors.white.withAlpha(30),
                            height: 1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // ── Sign up link ───────────────────────────────────
                    Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "Don't have an account? ",
                            style: TextStyle(
                              color: Colors.white.withAlpha(153),
                              fontSize: 14,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Get.toNamed(AppRoutes.register),
                            child: const Text(
                              'Sign Up',
                              style: TextStyle(
                                color: Color(0xFF7C6FCD),
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
