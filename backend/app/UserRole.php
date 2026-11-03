<?php

namespace App;

enum UserRole: string
{
    case User = 'user';
    case SuperAdmin = 'super_admin';
}
