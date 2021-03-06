//
//  FBXReader_Material.cpp
//  interface/src/fbx
//
//  Created by Sam Gateau on 8/27/2015.
//  Copyright 2015 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#include <iostream>
#include <QBuffer>
#include <QDataStream>
#include <QIODevice>
#include <QStringList>
#include <QTextStream>
#include <QtDebug>
#include <QtEndian>
#include <QFileInfo>
#include "FBXReader.h"

#include <memory>

bool FBXMaterial::needTangentSpace() const {
    return !normalTexture.isNull();
}

FBXTexture FBXReader::getTexture(const QString& textureID) {
    FBXTexture texture;
    texture.filename = _textureFilenames.value(textureID);
    texture.name = _textureNames.value(textureID);
    texture.content = _textureContent.value(texture.filename);
    texture.transform.setIdentity();
    texture.texcoordSet = 0;
    if (_textureParams.contains(textureID)) {
        auto p = _textureParams.value(textureID);
        
        texture.transform.setTranslation(p.translation);
        texture.transform.setRotation(glm::quat(glm::radians(p.rotation)));
        
        auto scaling = p.scaling;
        // Protect from bad scaling which should never happen
        if (scaling.x == 0.0f) {
            scaling.x = 1.0f;
        }
        if (scaling.y == 0.0f) {
            scaling.y = 1.0f;
        }
        if (scaling.z == 0.0f) {
            scaling.z = 1.0f;
        }
        texture.transform.setScale(scaling);
        
        if ((p.UVSet != "map1") && (p.UVSet != "UVSet0")) {
            texture.texcoordSet = 1;
        }
        texture.texcoordSetName = p.UVSet;
    }
    return texture;
}

void FBXReader::consolidateFBXMaterials() {
    
  // foreach (const QString& materialID, materials) {
    for (QHash<QString, FBXMaterial>::iterator it = _fbxMaterials.begin(); it != _fbxMaterials.end(); it++) {
        FBXMaterial& material = (*it);
        // the pure material associated with this part
        bool detectDifferentUVs = false;
        FBXTexture diffuseTexture;
        QString diffuseTextureID = diffuseTextures.value(material.materialID);
        if (!diffuseTextureID.isNull()) {
            diffuseTexture = getTexture(diffuseTextureID);
                    
            // FBX files generated by 3DSMax have an intermediate texture parent, apparently
            foreach (const QString& childTextureID, _connectionChildMap.values(diffuseTextureID)) {
                if (_textureFilenames.contains(childTextureID)) {
                    diffuseTexture = getTexture(diffuseTextureID);
                }
            }

            material.diffuseTexture = diffuseTexture;

            detectDifferentUVs = (diffuseTexture.texcoordSet != 0) || (!diffuseTexture.transform.isIdentity());
        }
                
        FBXTexture normalTexture;
        QString bumpTextureID = bumpTextures.value(material.materialID);
        QString normalTextureID = normalTextures.value(material.materialID);
        if (!normalTextureID.isNull()) {
            normalTexture = getTexture(normalTextureID);
            normalTexture.isBumpmap = false;
            
            material.normalTexture = normalTexture;
            detectDifferentUVs |= (normalTexture.texcoordSet != 0) || (!normalTexture.transform.isIdentity());
        } else if (!bumpTextureID.isNull()) {
            normalTexture = getTexture(bumpTextureID);
            normalTexture.isBumpmap = true;
            
            material.normalTexture = normalTexture;
            detectDifferentUVs |= (normalTexture.texcoordSet != 0) || (!normalTexture.transform.isIdentity());
        }
        
                
        FBXTexture specularTexture;
        QString specularTextureID = specularTextures.value(material.materialID);
        if (!specularTextureID.isNull()) {
            specularTexture = getTexture(specularTextureID);
            detectDifferentUVs |= (specularTexture.texcoordSet != 0) || (!specularTexture.transform.isIdentity());
        
            material.specularTexture = specularTexture;            
        }

        FBXTexture emissiveTexture;
        glm::vec2 emissiveParams(0.f, 1.f);
        emissiveParams.x = _lightmapOffset;
        emissiveParams.y = _lightmapLevel;

        QString emissiveTextureID = emissiveTextures.value(material.materialID);
        QString ambientTextureID = ambientTextures.value(material.materialID);
        if (_loadLightmaps && (!emissiveTextureID.isNull() || !ambientTextureID.isNull())) {

            if (!emissiveTextureID.isNull()) {
                emissiveTexture = getTexture(emissiveTextureID);
                emissiveParams.y = 4.0f;
            } else if (!ambientTextureID.isNull()) {
                emissiveTexture = getTexture(ambientTextureID);
            }

            material.emissiveParams = emissiveParams;
            material.emissiveTexture = emissiveTexture;

            detectDifferentUVs |= (emissiveTexture.texcoordSet != 0) || (!emissiveTexture.transform.isIdentity());
        }

        // Finally create the true material representation
        material._material = std::make_shared<model::Material>();
        material._material->setEmissive(material.emissiveColor);

        auto diffuse = material.diffuseColor;
        // FIXME: Do not use the Diffuse Factor yet as some FBX models have it set to 0
        // diffuse *= material.diffuseFactor;
        material._material->setDiffuse(diffuse);

        float metallic = std::max(material.specularColor.x, std::max(material.specularColor.y, material.specularColor.z));
        // FIXME: Do not use the Specular Factor yet as some FBX models have it set to 0
        // metallic *= material.specularFactor;
        material._material->setMetallic(metallic);
        material._material->setGloss(material.shininess);

        if (material.opacity <= 0.0f) {
            material._material->setOpacity(1.0f);
        } else {
            material._material->setOpacity(material.opacity);
        }
    }
}
