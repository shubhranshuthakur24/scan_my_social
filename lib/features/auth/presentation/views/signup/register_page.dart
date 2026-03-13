import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_starter/features/auth/presentation/views/widgets/app_input_field.dart';
import 'package:getx_starter/features/auth/presentation/views/widgets/primary_button.dart';
import 'package:getx_starter/routes/app_routes.dart';

import '../../controllers/register_controller.dart';

class RegisterPage extends GetView<RegisterController> {
  const RegisterPage({super.key});

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
          child: Column(
            children: [
              // ── Back button row ──────────────────────────────────────
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.only(left: 8, top: 8),
                  child: IconButton(
                    onPressed: () => Get.back(),
                    icon: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(20),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withAlpha(30)),
                      ),
                      child: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ),

              // ── Scrollable content ───────────────────────────────────
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 28,
                    vertical: 16,
                  ),
                  child: Form(
                    key: controller.formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Header ─────────────────────────────────────
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
                              Icons.person_add_rounded,
                              size: 36,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(height: 28),
                        const Text(
                          'Create account',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Sign up to get started',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.white.withAlpha(153),
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                        const SizedBox(height: 36),

                        // ── Name ───────────────────────────────────────
                        AppInputField(
                          label: 'Full Name',
                          hint: 'John Doe',
                          controller: controller.nameController,
                          validator: controller.validateName,
                          keyboardType: TextInputType.name,
                          textInputAction: TextInputAction.next,
                        ),
                        const SizedBox(height: 20),

                        // ── Email ──────────────────────────────────────
                        AppInputField(
                          label: 'Email',
                          hint: 'you@example.com',
                          controller: controller.emailController,
                          validator: controller.validateEmail,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                        ),
                        const SizedBox(height: 20),

                        // ── Password ───────────────────────────────────
                        Obx(
                          () => AppInputField(
                            label: 'Password',
                            hint: '••••••••',
                            controller: controller.passwordController,
                            validator: controller.validatePassword,
                            obscureText: controller.isPasswordHidden.value,
                            textInputAction: TextInputAction.next,
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
                        const SizedBox(height: 20),

                        // ── Confirm password ───────────────────────────
                        Obx(
                          () => AppInputField(
                            label: 'Confirm Password',
                            hint: '••••••••',
                            controller: controller.confirmPasswordController,
                            validator: controller.validateConfirmPassword,
                            obscureText:
                                controller.isConfirmPasswordHidden.value,
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) => controller.register(),
                            suffixIcon: IconButton(
                              onPressed:
                                  controller.toggleConfirmPasswordVisibility,
                              icon: Icon(
                                controller.isConfirmPasswordHidden.value
                                    ? Icons.visibility_off_rounded
                                    : Icons.visibility_rounded,
                                color: Colors.white54,
                                size: 22,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // ── Password hint ──────────────────────────────
                        Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: Row(
                            children: [
                              Icon(
                                Icons.info_outline_rounded,
                                size: 14,
                                color: Colors.white.withAlpha(102),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Must be at least 6 characters',
                                style: TextStyle(
                                  color: Colors.white.withAlpha(102),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 28),

                        // ── Error message ──────────────────────────────
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

                        // ── Register button ────────────────────────────
                        Obx(
                          () => PrimaryButton(
                            label: 'Create Account',
                            isLoading: controller.isLoading.value,
                            onPressed: controller.isLoading.value
                                ? null
                                : controller.register,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // ── Sign in link ───────────────────────────────
                        Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Already have an account? ',
                                style: TextStyle(
                                  color: Colors.white.withAlpha(153),
                                  fontSize: 14,
                                ),
                              ),
                              GestureDetector(
                                onTap: () => Get.toNamed(AppRoutes.login),
                                child: const Text(
                                  'Sign In',
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
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
