import 'package:firebase_auth/firebase_auth.dart';
import 'package:get/get.dart';
import 'package:getx_starter/core/utils/app_logger.dart';
import 'package:getx_starter/routes/app_routes.dart';

class SplashController extends GetxController {
  static const _tag = 'SplashController';

  @override
  void onInit() {
    super.onInit();
    AppLogger.info('SplashController initialised', tag: _tag);
    _navigate();
  }

  Future<void> _navigate() async {
    // Wait for the animation to play (2.5 s feels snappy but complete)
    await Future.delayed(const Duration(milliseconds: 2500));

    final user = FirebaseAuth.instance.currentUser;

    if (user != null) {
      AppLogger.info('User already signed in → home', tag: _tag);
      Get.offAllNamed(AppRoutes.home);
    } else {
      AppLogger.info('No user session → login', tag: _tag);
      Get.offAllNamed(AppRoutes.login);
    }
  }
}
