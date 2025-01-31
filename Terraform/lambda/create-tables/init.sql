create table if not exists users
(
    userId            varchar(255) not null
        primary key,
    password          varchar(255) not null,
    name              varchar(255) not null,
    profilePictureUrl tinytext     null
);

create table if not exists githubUsers
(
    userId   varchar(255) not null
        primary key,
    githubId int          not null,
    constraint githubUsers_users_userId_fk
        foreign key (userId) references users (userId)
            on delete cascade
);

create table if not exists subscriptions
(
    subscriberId   varchar(255) not null,
    subscribedToId varchar(255) not null,
    primary key (subscriberId, subscribedToId),
    constraint subscriptions_ibfk_1
        foreign key (subscriberId) references users (userId)
            on delete cascade,
    constraint subscriptions_ibfk_2
        foreign key (subscribedToId) references users (userId)
            on delete cascade
);

create table if not exists videos
(
    id                varchar(255)                  not null
        primary key,
    userId            varchar(255)                  not null,
    title             varchar(255)                  not null,
    uploadDate        datetime                      not null,
    status            enum ('PROCESSING', 'PUBLIC') not null,
    description       text                          null,
    constraint videos_ibfk_1
        foreign key (userId) references users (userId)
            on delete cascade
);

create table if not exists comments
(
    id      varchar(255) not null
        primary key,
    videoId varchar(255) not null,
    userId  varchar(255) not null,
    content text         not null,
    date    datetime     not null,
    constraint comments_ibfk_1
        foreign key (videoId) references videos (id)
            on delete cascade,
    constraint comments_ibfk_2
        foreign key (userId) references users (userId)
            on delete cascade
);

create table if not exists likes
(
    videoId varchar(255) not null,
    userId  varchar(255) not null,
    primary key (videoId, userId),
    constraint likes_ibfk_1
        foreign key (videoId) references videos (id)
            on delete cascade,
    constraint likes_ibfk_2
        foreign key (userId) references users (userId)
            on delete cascade
);

create table if not exists video_moderation
(
    videoId varchar(255) not null,
    type    varchar(255) not null,
    primary key (videoId, type),
    constraint video_moderation_videos_id_fk
        foreign key (videoId) references videos (id)
            on update cascade on delete cascade
);

create table if not exists views
(
    videoId varchar(255) not null,
    userId  varchar(255) not null,
    primary key (videoId, userId),
    constraint views_ibfk_1
        foreign key (videoId) references videos (id)
            on delete cascade,
    constraint views_ibfk_2
        foreign key (userId) references users (userId)
);