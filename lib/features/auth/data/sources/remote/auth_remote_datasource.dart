import 'package:firebase_auth/firebase_auth.dart';
import 'package:getx_starter/core/utils/app_logger.dart';

class AuthRemoteDataSource {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  static const _tag = 'AuthRemoteDataSource';

  // Login
  Future<UserCredential> login(String email, String password) async {
    AppLogger.debug('Calling signInWithEmailAndPassword', tag: _tag);
    return await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  // Register
  Future<UserCredential> register(String email, String password) async {
    AppLogger.debug('Calling createUserWithEmailAndPassword', tag: _tag);
    return await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  // Logout
  Future<void> logout() async {
    AppLogger.debug('Calling signOut', tag: _tag);
    await _auth.signOut();
  }

  // Current User
  User? get currentUser => _auth.currentUser;
}
