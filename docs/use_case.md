```mermaid
flowchart TD

hp(Home Page)
hp-->u(user)
hp-->g(guest)

u-->up[upload]
u-->m[account/video management]
u-->view[view video]

g-->view1[view video]

view-->c[comment]
view-->s[share]
view-->l[like]
```