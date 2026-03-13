// Run `flutter pub run build_runner build --delete-conflicting-outputs`
// to regenerate mocks.mocks.dart after any changes here.

import 'package:firebase_auth/firebase_auth.dart';
import 'package:mockito/annotations.dart';
import 'package:getx_starter/features/auth/data/sources/remote/auth_remote_datasource.dart';
import 'package:getx_starter/features/auth/domain/repos/auth_repository.dart';
import 'package:getx_starter/features/auth/domain/usecases/login_usecase.dart';
import 'package:getx_starter/features/auth/domain/usecases/register_usecase.dart';

@GenerateMocks([
  AuthRepository,
  AuthRemoteDataSource,
  LoginUseCase,
  RegisterUseCase,
  UserCredential,
  User,
])
void main() {}
