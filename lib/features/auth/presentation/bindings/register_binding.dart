import 'package:get/get.dart';
import 'package:getx_starter/features/auth/domain/usecases/register_usecase.dart';

import '../controllers/register_controller.dart';

class RegisterBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<RegisterController>(
      () => RegisterController(Get.find<RegisterUseCase>()),
    );
  }
}
