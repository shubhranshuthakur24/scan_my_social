import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_starter/core/di/injection_container.dart';
import 'package:getx_starter/core/config/firebase_options.dart';
import 'package:getx_starter/core/theme/app_theme.dart';
import 'package:getx_starter/routes/app_pages.dart';
import 'package:getx_starter/routes/app_routes.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase — guard against hot-restart duplicate-app error
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } on FirebaseException catch (e) {
    if (e.code != 'duplicate-app') rethrow;
  }

  // Register all dependencies
  InjectionContainer.init();

  runApp(const StarterApp());
}

class StarterApp extends StatelessWidget {
  const StarterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'GetX Starter',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      initialRoute: AppRoutes.splash,
      getPages: AppPages.routes,
    );
  }
}
