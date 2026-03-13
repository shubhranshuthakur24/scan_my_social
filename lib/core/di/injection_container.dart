import 'package:dio/dio.dart';
import 'package:get/get.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import 'package:getx_starter/core/network/dio_client.dart';
import 'package:getx_starter/core/network/network_info.dart';
import 'package:getx_starter/features/auth/data/sources/remote/auth_remote_datasource.dart';
import 'package:getx_starter/features/auth/data/repos/auth_repository_impl.dart';
import 'package:getx_starter/features/auth/domain/repos/auth_repository.dart';
import 'package:getx_starter/features/auth/domain/usecases/login_usecase.dart';
import 'package:getx_starter/features/auth/domain/usecases/register_usecase.dart';

// Face imports
import 'package:getx_starter/features/face_detection/data/sources/local/face_local_datasource.dart';
import 'package:getx_starter/features/face_detection/data/repos/face_repository_impl.dart';
import 'package:getx_starter/features/face_detection/domain/repos/face_repository.dart';
import 'package:getx_starter/features/face_detection/domain/usecases/generate_face_embedding_usecase.dart';
import 'package:getx_starter/features/face_detection/domain/usecases/verify_face_usecase.dart';
import 'package:getx_starter/features/face_detection/presentation/controllers/face_controller.dart';

/// Registers all dependencies with GetX's service locator.
/// Call [InjectionContainer.init()] once in main() before runApp().
class InjectionContainer {
  static void init() {
    // ── Core ──────────────────────────────────────────────────────────────
    Get.put<NetworkInfo>(NetworkInfoImpl(Connectivity()), permanent: true);

    Get.put<Dio>(DioClient.create(), permanent: true);

    // Data sources
    Get.lazyPut<AuthRemoteDataSource>(
      () => AuthRemoteDataSource(),
      fenix: true,
    );

    // Repositories
    Get.lazyPut<AuthRepository>(
      () => AuthRepositoryImpl(Get.find<AuthRemoteDataSource>()),
      fenix: true,
    );

    // Use cases
    Get.lazyPut<LoginUseCase>(
      () => LoginUseCase(Get.find<AuthRepository>()),
      fenix: true,
    );

    Get.lazyPut<RegisterUseCase>(
      () => RegisterUseCase(Get.find<AuthRepository>()),
      fenix: true,
    );

    // ==============================
    // FACE VERIFICATION MODULE
    // ==============================

    // Local Datasource
    Get.lazyPut<FaceLocalDatasource>(
      () => FaceLocalDatasourceImpl(),
      fenix: true,
    );

    // Repository
    Get.lazyPut<FaceRepository>(
      () => FaceRepositoryImpl(
        Get.find<FaceLocalDatasource>(),
        FirebaseFirestore.instance,
      ),
      fenix: true,
    );

    // Usecases
    Get.lazyPut<GenerateFaceEmbeddingUseCase>(
      () => GenerateFaceEmbeddingUseCase(Get.find<FaceRepository>()),
      fenix: true,
    );

    Get.lazyPut<VerifyFaceUseCase>(
      () => VerifyFaceUseCase(Get.find<FaceRepository>()),
      fenix: true,
    );

    // Controller
    Get.lazyPut<FaceController>(
      () => FaceController(
        generateUsecase: Get.find<GenerateFaceEmbeddingUseCase>(),
        verifyUsecase: Get.find<VerifyFaceUseCase>(),
      ),
      fenix: true,
    );
  }
}
