import { Request, Response, NextFunction } from "express";
import { pick } from "lodash";
type FilterKeys<T> = Array<keyof T>;
export const filterMiddleware = <T>(filterKeys: FilterKeys<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    req.body = pick(req.body, filterKeys);
    next();
  };


/*
FILTER MIDDLEWARE
────────────────────────────────────────

type FilterKeys<T> = Array<keyof T>

→ T = Generic type
→ keyof T = lấy tên các property của T
→ Array<keyof T> = mảng chỉ chứa các key hợp lệ của T


filterMiddleware<T>(filterKeys)
→ Đây KHÔNG phải middleware trực tiếp.
→ Nó là "hàm tạo middleware" (middleware factory).

Flow:

filterMiddleware<User>(['name', 'bio'])
              ↓
        nhận filterKeys
              ↓
        trả về middleware
              ↓
(req, res, next) => {
    req.body = pick(req.body, filterKeys)
    next()
}


pick(req.body, filterKeys)
→ chỉ giữ lại những field nằm trong filterKeys.


Ví dụ:

User {
  name
  email
  bio
  password
}

filterMiddleware<User>(['name', 'bio'])

Request:
{
  name,
  bio,
  email,
  password
}

        ↓ pick()

{
  name,
  bio
}


Tại sao dùng keyof thay vì string[]?

string[]
→ cho phép mọi chuỗi
→ 'name', 'abc', 'xyz' đều được

Array<keyof User>
→ chỉ cho phép key tồn tại trong User
→ 'name', 'email', 'bio' ✅
→ 'abc', 'xyz' ❌


Công thức nhớ:

T
↓
"Type nào?"

keyof T
↓
"Những key nào thuộc Type đó?"

Array<keyof T>
↓
"Mảng chứa những key đó"

filterMiddleware<T>
↓
"Nhận danh sách key → tạo middleware để lọc req.body"
*/