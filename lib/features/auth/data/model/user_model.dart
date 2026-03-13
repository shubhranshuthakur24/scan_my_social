import 'package:firebase_auth/firebase_auth.dart';
import 'package:getx_starter/features/auth/domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({required super.uid, super.email, super.displayName});

  factory UserModel.fromFirebaseUser(User user) {
    return UserModel(
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    );
  }
}
