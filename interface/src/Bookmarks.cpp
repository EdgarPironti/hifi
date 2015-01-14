//
//  Bookmarks.cpp
//  interface/src
//
//  Created by David Rowe on 13 Jan 2015.
//  Copyright 2015 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#include "Bookmarks.h"

Bookmarks::Bookmarks() {
}

void Bookmarks::insert(const QString& name, const QString& address) {
    QString key = name.toLower();

    QJsonObject bookmark;
    bookmark.insert("name", name);
    bookmark.insert("address", address);
    _bookmarks.insert(key, bookmark);

    if (contains(key)) {
        qDebug() << "Added bookmark: " << name << ", " << address;
    } else {
        qDebug() << "Couldn't add bookmark: " << name << ", " << address;
    }
}

void Bookmarks::remove(const QString& name) {
    QString key = name.toLower();

    _bookmarks.remove(key);

    if (!contains(key)) {
        qDebug() << "Removed bookmark: " << name;
    } else {
        qDebug() << "Couldn't remove bookmark: " << name;
    }
}

bool Bookmarks::contains(const QString& name) const {
    return _bookmarks.contains(name.toLower());
}
