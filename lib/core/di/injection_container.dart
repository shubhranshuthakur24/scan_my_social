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
  }
}
