//
//  Created by Sam Gateau on 4/27/15.
//  Copyright 2015 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#include "UserInputMapper.h"

#include <set>

#include <QtCore/QThread>
#include <QtCore/QFile>

#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QJsonArray>

#include <PathUtils.h>
#include <NumericalConstants.h>

#include "StandardController.h"
#include "StateController.h"

#include "Logging.h"

#include "impl/conditionals/AndConditional.h"
#include "impl/conditionals/EndpointConditional.h"
#include "impl/conditionals/ScriptConditional.h"

#include "impl/endpoints/ActionEndpoint.h"
#include "impl/endpoints/AnyEndpoint.h"
#include "impl/endpoints/ArrayEndpoint.h"
#include "impl/endpoints/CompositeEndpoint.h"
#include "impl/endpoints/InputEndpoint.h"
#include "impl/endpoints/JSEndpoint.h"
#include "impl/endpoints/ScriptEndpoint.h"
#include "impl/endpoints/StandardEndpoint.h"

#include "impl/Route.h"
#include "impl/Mapping.h"


namespace controller {
    const uint16_t UserInputMapper::ACTIONS_DEVICE = Input::INVALID_DEVICE - 0xFF;
    const uint16_t UserInputMapper::STANDARD_DEVICE = 0;
}

// Default contruct allocate the poutput size with the current hardcoded action channels
controller::UserInputMapper::UserInputMapper() {
    registerDevice(std::make_shared<ActionsDevice>());
    registerDevice(std::make_shared<StandardController>());
}

namespace controller {

    
UserInputMapper::~UserInputMapper() {
}

int UserInputMapper::recordDeviceOfType(const QString& deviceName) {
    if (!_deviceCounts.contains(deviceName)) {
        _deviceCounts[deviceName] = 0;
    }
    _deviceCounts[deviceName] += 1;
    return _deviceCounts[deviceName];
}

void UserInputMapper::registerDevice(InputDevice::Pointer device) {
    Locker locker(_lock);
    if (device->_deviceID == Input::INVALID_DEVICE) {
        device->_deviceID = getFreeDeviceID();
    }
    const auto& deviceID = device->_deviceID;

    recordDeviceOfType(device->getName());

    qCDebug(controllers) << "Registered input device <" << device->getName() << "> deviceID = " << deviceID;
    for (const auto& inputMapping : device->getAvailableInputs()) {
        const auto& input = inputMapping.first;
        // Ignore aliases
        if (_endpointsByInput.count(input)) {
            continue;
        }

        Endpoint::Pointer endpoint = device->createEndpoint(input);
        if (!endpoint) {
            if (input.device == STANDARD_DEVICE) {
                endpoint = std::make_shared<StandardEndpoint>(input);
            } else if (input.device == ACTIONS_DEVICE) {
                endpoint = std::make_shared<ActionEndpoint>(input);
            } else {
                endpoint = std::make_shared<InputEndpoint>(input);
            }
        }
        _inputsByEndpoint[endpoint] = input;
        _endpointsByInput[input] = endpoint;
    }

    _registeredDevices[deviceID] = device;
    auto mapping = loadMapping(device->getDefaultMappingConfig());
    if (mapping) {
        _mappingsByDevice[deviceID] = mapping;
        enableMapping(mapping);
    }

    emit hardwareChanged();
}

// FIXME remove the associated device mappings
void UserInputMapper::removeDevice(int deviceID) {
    Locker locker(_lock);
    auto proxyEntry = _registeredDevices.find(deviceID);
    if (_registeredDevices.end() == proxyEntry) {
        qCWarning(controllers) << "Attempted to remove unknown device " << deviceID;
        return;
    }
    auto proxy = proxyEntry->second;
    auto mappingsEntry = _mappingsByDevice.find(deviceID);
    if (_mappingsByDevice.end() != mappingsEntry) {
        disableMapping(mappingsEntry->second);
        _mappingsByDevice.erase(mappingsEntry);
    }

    _registeredDevices.erase(proxyEntry);

    emit hardwareChanged();
}


void UserInputMapper::loadDefaultMapping(uint16 deviceID) {
    Locker locker(_lock);
    auto proxyEntry = _registeredDevices.find(deviceID);
    if (_registeredDevices.end() == proxyEntry) {
        qCWarning(controllers) << "Unknown deviceID " << deviceID;
        return;
    }


    auto mapping = loadMapping(proxyEntry->second->getDefaultMappingConfig());
    if (mapping) {
        auto prevMapping = _mappingsByDevice[deviceID];
        disableMapping(prevMapping);

        _mappingsByDevice[deviceID] = mapping;
        enableMapping(mapping);
    }

    emit hardwareChanged();
}

InputDevice::Pointer UserInputMapper::getDevice(const Input& input) {
    Locker locker(_lock);
    auto device = _registeredDevices.find(input.getDevice());
    if (device != _registeredDevices.end()) {
        return (device->second);
    } else {
        return InputDevice::Pointer();
    }
}

QString UserInputMapper::getDeviceName(uint16 deviceID) { 
    Locker locker(_lock);
    if (_registeredDevices.find(deviceID) != _registeredDevices.end()) {
        return _registeredDevices[deviceID]->_name;
    }
    return QString("unknown");
}

int UserInputMapper::findDevice(QString name) const {
    Locker locker(_lock);
    for (auto device : _registeredDevices) {
        if (device.second->_name == name) {
            return device.first;
        }
    }
    return Input::INVALID_DEVICE;
}

QVector<QString> UserInputMapper::getDeviceNames() {
    Locker locker(_lock);
    QVector<QString> result;
    for (auto device : _registeredDevices) {
        QString deviceName = device.second->_name.split(" (")[0];
        result << deviceName;
    }
    return result;
}

int UserInputMapper::findAction(const QString& actionName) const {
    return findDeviceInput("Actions." + actionName).getChannel();
}

Input UserInputMapper::findDeviceInput(const QString& inputName) const {
    Locker locker(_lock);
    // Split the full input name as such: deviceName.inputName
    auto names = inputName.split('.');

    if (names.size() >= 2) {
        // Get the device name:
        auto deviceName = names[0];
        auto inputName = names[1];

        int deviceID = findDevice(deviceName);
        if (deviceID != Input::INVALID_DEVICE) {
            const auto& device = _registeredDevices.at(deviceID);
            auto deviceInputs = device->getAvailableInputs();

            for (auto input : deviceInputs) {
                if (input.second == inputName) {
                    return input.first;
                }
            }

            qCDebug(controllers) << "Couldn\'t find InputChannel named <" << inputName << "> for device <" << deviceName << ">";

        } else {
            qCDebug(controllers) << "Couldn\'t find InputDevice named <" << deviceName << ">";
            findDevice(deviceName);
        }
    } else {
        qCDebug(controllers) << "Couldn\'t understand <" << inputName << "> as a valid inputDevice.inputName";
    }

    return Input::INVALID_INPUT;
}

void fixBisectedAxis(float& full, float& negative, float& positive) {
    full = full + (negative * -1.0f) + positive;
    negative = full >= 0.0f ? 0.0f : full * -1.0f;
    positive = full <= 0.0f ? 0.0f : full;
}

void UserInputMapper::update(float deltaTime) {
    Locker locker(_lock);
    // Reset the axis state for next loop
    for (auto& channel : _actionStates) {
        channel = 0.0f;
    }
    
    for (auto& channel : _poseStates) {
        channel = Pose();
    }

    // Run the mappings code
    runMappings();

    // merge the bisected and non-bisected axes for now
    fixBisectedAxis(_actionStates[toInt(Action::TRANSLATE_X)], _actionStates[toInt(Action::LATERAL_LEFT)], _actionStates[toInt(Action::LATERAL_RIGHT)]);
    fixBisectedAxis(_actionStates[toInt(Action::TRANSLATE_Y)], _actionStates[toInt(Action::VERTICAL_DOWN)], _actionStates[toInt(Action::VERTICAL_UP)]);
    fixBisectedAxis(_actionStates[toInt(Action::TRANSLATE_Z)], _actionStates[toInt(Action::LONGITUDINAL_FORWARD)], _actionStates[toInt(Action::LONGITUDINAL_BACKWARD)]);
    fixBisectedAxis(_actionStates[toInt(Action::TRANSLATE_CAMERA_Z)], _actionStates[toInt(Action::BOOM_IN)], _actionStates[toInt(Action::BOOM_OUT)]);
    fixBisectedAxis(_actionStates[toInt(Action::ROTATE_Y)], _actionStates[toInt(Action::YAW_LEFT)], _actionStates[toInt(Action::YAW_RIGHT)]);
    fixBisectedAxis(_actionStates[toInt(Action::ROTATE_X)], _actionStates[toInt(Action::PITCH_UP)], _actionStates[toInt(Action::PITCH_DOWN)]);

    static const float EPSILON = 0.01f;
    for (auto i = 0; i < toInt(Action::NUM_ACTIONS); i++) {
        _actionStates[i] *= _actionScales[i];
        // Emit only on change, and emit when moving back to 0
        if (fabsf(_actionStates[i] - _lastActionStates[i]) > EPSILON) {
            _lastActionStates[i] = _actionStates[i];
            emit actionEvent(i, _actionStates[i]);
        }
        // TODO: emit signal for pose changes
    }

    auto standardInputs = getStandardInputs();
    if ((int)_lastStandardStates.size() != standardInputs.size()) {
        _lastStandardStates.resize(standardInputs.size());
        for (auto& lastValue : _lastStandardStates) {
            lastValue = 0;
        }
    }

    for (int i = 0; i < standardInputs.size(); ++i) {
        const auto& input = standardInputs[i].first;
        float value = getValue(input);
        float& oldValue = _lastStandardStates[i];
        if (value != oldValue) {
            oldValue = value;
            emit inputEvent(input.id, value);
        }
    }
}

Input::NamedVector UserInputMapper::getAvailableInputs(uint16 deviceID) const {
    Locker locker(_lock);
    auto iterator = _registeredDevices.find(deviceID);
    return iterator->second->getAvailableInputs();
}

QVector<Action> UserInputMapper::getAllActions() const {
    Locker locker(_lock);
    QVector<Action> actions;
    for (auto i = 0; i < toInt(Action::NUM_ACTIONS); i++) {
        actions.append(Action(i));
    }
    return actions;
}

QString UserInputMapper::getActionName(Action action) const {
    Locker locker(_lock);
    for (auto actionPair : getActionInputs()) {
        if (actionPair.first.channel == toInt(action)) {
            return actionPair.second;
        }
    }
    return QString();
}


QVector<QString> UserInputMapper::getActionNames() const {
    Locker locker(_lock);
    QVector<QString> result;
    for (auto actionPair : getActionInputs()) {
        result << actionPair.second;
    }
    return result;
}
/*
void UserInputMapper::assignDefaulActionScales() {
    _actionScales[toInt(Action::LONGITUDINAL_BACKWARD)] = 1.0f; // 1m per unit
    _actionScales[toInt(Action::LONGITUDINAL_FORWARD)] = 1.0f; // 1m per unit
    _actionScales[toInt(Action::LATERAL_LEFT)] = 1.0f; // 1m per unit
    _actionScales[toInt(Action::LATERAL_RIGHT)] = 1.0f; // 1m per unit
    _actionScales[toInt(Action::VERTICAL_DOWN)] = 1.0f; // 1m per unit
    _actionScales[toInt(Action::VERTICAL_UP)] = 1.0f; // 1m per unit
    _actionScales[toInt(Action::YAW_LEFT)] = 1.0f; // 1 degree per unit
    _actionScales[toInt(Action::YAW_RIGHT)] = 1.0f; // 1 degree per unit
    _actionScales[toInt(Action::PITCH_DOWN)] = 1.0f; // 1 degree per unit
    _actionScales[toInt(Action::PITCH_UP)] = 1.0f; // 1 degree per unit
    _actionScales[toInt(Action::BOOM_IN)] = 0.5f; // .5m per unit
    _actionScales[toInt(Action::BOOM_OUT)] = 0.5f; // .5m per unit
    _actionScales[toInt(Action::LEFT_HAND)] = 1.0f; // default
    _actionScales[toInt(Action::RIGHT_HAND)] = 1.0f; // default
    _actionScales[toInt(Action::LEFT_HAND_CLICK)] = 1.0f; // on
    _actionScales[toInt(Action::RIGHT_HAND_CLICK)] = 1.0f; // on
    _actionScales[toInt(Action::SHIFT)] = 1.0f; // on
    _actionScales[toInt(Action::ACTION1)] = 1.0f; // default
    _actionScales[toInt(Action::ACTION2)] = 1.0f; // default
    _actionScales[toInt(Action::TRANSLATE_X)] = 1.0f; // default
    _actionScales[toInt(Action::TRANSLATE_Y)] = 1.0f; // default
    _actionScales[toInt(Action::TRANSLATE_Z)] = 1.0f; // default
    _actionScales[toInt(Action::ROLL)] = 1.0f; // default
    _actionScales[toInt(Action::PITCH)] = 1.0f; // default
    _actionScales[toInt(Action::YAW)] = 1.0f; // default
}
*/

static int actionMetaTypeId = qRegisterMetaType<Action>();
static int inputMetaTypeId = qRegisterMetaType<Input>();
static int inputPairMetaTypeId = qRegisterMetaType<Input::NamedPair>();
static int poseMetaTypeId = qRegisterMetaType<controller::Pose>("Pose");


QScriptValue inputToScriptValue(QScriptEngine* engine, const Input& input);
void inputFromScriptValue(const QScriptValue& object, Input& input);
QScriptValue actionToScriptValue(QScriptEngine* engine, const Action& action);
void actionFromScriptValue(const QScriptValue& object, Action& action);
QScriptValue inputPairToScriptValue(QScriptEngine* engine, const Input::NamedPair& inputPair);
void inputPairFromScriptValue(const QScriptValue& object, Input::NamedPair& inputPair);

QScriptValue inputToScriptValue(QScriptEngine* engine, const Input& input) {
    QScriptValue obj = engine->newObject();
    obj.setProperty("device", input.getDevice());
    obj.setProperty("channel", input.getChannel());
    obj.setProperty("type", (unsigned short)input.getType());
    obj.setProperty("id", input.getID());
    return obj;
}

void inputFromScriptValue(const QScriptValue& object, Input& input) {
    input.id = object.property("id").toInt32();
}

QScriptValue actionToScriptValue(QScriptEngine* engine, const Action& action) {
    QScriptValue obj = engine->newObject();
    auto userInputMapper = DependencyManager::get<UserInputMapper>();
    obj.setProperty("action", (int)action);
    obj.setProperty("actionName", userInputMapper->getActionName(action));
    return obj;
}

void actionFromScriptValue(const QScriptValue& object, Action& action) {
    action = Action(object.property("action").toVariant().toInt());
}

QScriptValue inputPairToScriptValue(QScriptEngine* engine, const Input::NamedPair& inputPair) {
    QScriptValue obj = engine->newObject();
    obj.setProperty("input", inputToScriptValue(engine, inputPair.first));
    obj.setProperty("inputName", inputPair.second);
    return obj;
}

void inputPairFromScriptValue(const QScriptValue& object, Input::NamedPair& inputPair) {
    inputFromScriptValue(object.property("input"), inputPair.first);
    inputPair.second = QString(object.property("inputName").toVariant().toString());
}

void UserInputMapper::registerControllerTypes(QScriptEngine* engine) {
    qScriptRegisterSequenceMetaType<QVector<Action> >(engine);
    qScriptRegisterSequenceMetaType<Input::NamedVector>(engine);
    qScriptRegisterMetaType(engine, actionToScriptValue, actionFromScriptValue);
    qScriptRegisterMetaType(engine, inputToScriptValue, inputFromScriptValue);
    qScriptRegisterMetaType(engine, inputPairToScriptValue, inputPairFromScriptValue);

    qScriptRegisterMetaType(engine, Pose::toScriptValue, Pose::fromScriptValue);
}

Input UserInputMapper::makeStandardInput(controller::StandardButtonChannel button) {
    return Input(STANDARD_DEVICE, button, ChannelType::BUTTON);
}

Input UserInputMapper::makeStandardInput(controller::StandardAxisChannel axis) {
    return Input(STANDARD_DEVICE, axis, ChannelType::AXIS);
}

Input UserInputMapper::makeStandardInput(controller::StandardPoseChannel pose) {
    return Input(STANDARD_DEVICE, pose, ChannelType::POSE);
}

static auto lastDebugTime = usecTimestampNow();
static auto debugRoutes = false;
static auto debuggableRoutes = false;
static const auto DEBUG_INTERVAL = USECS_PER_SECOND;

void UserInputMapper::runMappings() {
    auto now = usecTimestampNow();
    if (debuggableRoutes && now - lastDebugTime > DEBUG_INTERVAL) {
        lastDebugTime = now;
        debugRoutes = true;
    }

    if (debugRoutes) {
        qCDebug(controllers) << "Beginning mapping frame";
    }
    for (auto endpointEntry : this->_endpointsByInput) {
        endpointEntry.second->reset();
    }

    if (debugRoutes) {
        qCDebug(controllers) << "Processing device routes";
    }
    // Now process the current values for each level of the stack
    applyRoutes(_deviceRoutes);

    if (debugRoutes) {
        qCDebug(controllers) << "Processing standard routes";
    }
    applyRoutes(_standardRoutes);

    if (debugRoutes) {
        qCDebug(controllers) << "Done with mappings";
    }
    debugRoutes = false;
}

// Encapsulate the logic that routes should not be read before they are written
void UserInputMapper::applyRoutes(const Route::List& routes) {
    Route::List deferredRoutes;

    for (const auto& route : routes) {
        if (!route) {
            continue;
        }

        // Try all the deferred routes
        deferredRoutes.remove_if([](Route::Pointer route) {
            return UserInputMapper::applyRoute(route);
        });

        if (!applyRoute(route)) {
            deferredRoutes.push_back(route);
        }
    }

    bool force = true;
    for (const auto& route : deferredRoutes) {
        UserInputMapper::applyRoute(route, force);
    }
}


bool UserInputMapper::applyRoute(const Route::Pointer& route, bool force) {
    if (debugRoutes && route->debug) {
        qCDebug(controllers) << "Applying route " << route->json;
    }

    // If the source hasn't been written yet, defer processing of this route
    auto source = route->source;
    auto sourceInput = source->getInput();
    if (sourceInput.device == STANDARD_DEVICE && !force && source->writeable()) {
        if (debugRoutes && route->debug) {
            qCDebug(controllers) << "Source not yet written, deferring";
        }
        return false;
    }

    if (route->conditional) {
        // FIXME for endpoint conditionals we need to check if they've been written
        if (!route->conditional->satisfied()) {
            if (debugRoutes && route->debug) {
                qCDebug(controllers) << "Conditional failed";
            }
            return true;
        }
    }


    // Most endpoints can only be read once (though a given mapping can route them to 
    // multiple places).  Consider... If the default is to wire the A button to JUMP
    // and someone else wires it to CONTEXT_MENU, I don't want both to occur when 
    // I press the button.  The exception is if I'm wiring a control back to itself
    // in order to adjust my interface, like inverting the Y axis on an analog stick
    if (!route->peek && !source->readable()) {
        if (debugRoutes && route->debug) {
            qCDebug(controllers) << "Source unreadable";
        }
        return true;
    }

    auto destination = route->destination;
    // THis could happen if the route destination failed to create
    // FIXME: Maybe do not create the route if the destination failed and avoid this case ?
    if (!destination) {
        if (debugRoutes && route->debug) {
            qCDebug(controllers) << "Bad Destination";
        }
        return true;
    }

    if (!destination->writeable()) {
        if (debugRoutes && route->debug) {
            qCDebug(controllers) << "Destination unwritable";
        }
        return true;
    }

    // Fetch the value, may have been overriden by previous loopback routes
    if (source->isPose()) {
        Pose value = getPose(source, route->peek);
        static const Pose IDENTITY_POSE { vec3(), quat() };
        if (debugRoutes && route->debug) {
            if (!value.valid) {
                qCDebug(controllers) << "Applying invalid pose";
            } else if (value == IDENTITY_POSE) {
                qCDebug(controllers) << "Applying identity pose";
            } else {
                qCDebug(controllers) << "Applying valid pose";
            }
        }
        // no filters yet for pose
        destination->apply(value, source);
    } else {
        // Fetch the value, may have been overriden by previous loopback routes
        float value = getValue(source, route->peek);

        if (debugRoutes && route->debug) {
            qCDebug(controllers) << "Value was " << value;
        }
        // Apply each of the filters.
        for (const auto& filter : route->filters) {
            value = filter->apply(value);
        }

        if (debugRoutes && route->debug) {
            qCDebug(controllers) << "Filtered value was " << value;
        }

        destination->apply(value, source);
    }
    return true;
}

Endpoint::Pointer UserInputMapper::endpointFor(const QJSValue& endpoint) {
    if (endpoint.isNumber()) {
        return endpointFor(Input(endpoint.toInt()));
    }

    if (endpoint.isCallable()) {
        auto result = std::make_shared<JSEndpoint>(endpoint);
        return result;
    }

    qWarning() << "Unsupported input type " << endpoint.toString();
    return Endpoint::Pointer();
}

Endpoint::Pointer UserInputMapper::endpointFor(const QScriptValue& endpoint) {
    if (endpoint.isNumber()) {
        return endpointFor(Input(endpoint.toInt32()));
    }

    if (endpoint.isFunction()) {
        auto result = std::make_shared<ScriptEndpoint>(endpoint);
        return result;
    }

    if (endpoint.isArray()) {
        int length = endpoint.property("length").toInteger();
        Endpoint::List children;
        for (int i = 0; i < length; i++) {
            QScriptValue arrayItem = endpoint.property(i);
            Endpoint::Pointer destination = endpointFor(arrayItem);
            if (!destination) {
                return Endpoint::Pointer();
            }
            children.push_back(destination);
        }
        return std::make_shared<AnyEndpoint>(children);
    }


    qWarning() << "Unsupported input type " << endpoint.toString();
    return Endpoint::Pointer();
}

Endpoint::Pointer UserInputMapper::endpointFor(const Input& inputId) const {
    Locker locker(_lock);
    auto iterator = _endpointsByInput.find(inputId);
    if (_endpointsByInput.end() == iterator) {
        qWarning() << "Unknown input: " << QString::number(inputId.getID(), 16);
        return Endpoint::Pointer();
    }
    return iterator->second;
}

Endpoint::Pointer UserInputMapper::compositeEndpointFor(Endpoint::Pointer first, Endpoint::Pointer second) {
    EndpointPair pair(first, second);
    Endpoint::Pointer result;
    auto iterator = _compositeEndpoints.find(pair);
    if (_compositeEndpoints.end() == iterator) {
        result = std::make_shared<CompositeEndpoint>(first, second);
        _compositeEndpoints[pair] = result;
    } else {
        result = iterator->second;
    }
    return result;
}


Mapping::Pointer UserInputMapper::newMapping(const QString& mappingName) {
    Locker locker(_lock);
    if (_mappingsByName.count(mappingName)) {
        qCWarning(controllers) << "Refusing to recreate mapping named " << mappingName;
    }
    qDebug() << "Creating new Mapping " << mappingName;
    auto mapping = std::make_shared<Mapping>(mappingName);
    _mappingsByName[mappingName] = mapping;
    return mapping;
}

// FIXME handle asynchronous loading in the UserInputMapper
//QObject* ScriptingInterface::loadMapping(const QString& jsonUrl) {
//    QObject* result = nullptr;
//    auto request = ResourceManager::createResourceRequest(nullptr, QUrl(jsonUrl));
//    if (request) {
//        QEventLoop eventLoop;
//        request->setCacheEnabled(false);
//        connect(request, &ResourceRequest::finished, &eventLoop, &QEventLoop::quit);
//        request->send();
//        if (request->getState() != ResourceRequest::Finished) {
//            eventLoop.exec();
//        }
//
//        if (request->getResult() == ResourceRequest::Success) {
//            result = parseMapping(QString(request->getData()));
//        } else {
//            qCWarning(controllers) << "Failed to load mapping url <" << jsonUrl << ">" << endl;
//        }
//        request->deleteLater();
//    }
//    return result;
//}

void UserInputMapper::enableMapping(const QString& mappingName, bool enable) {
    Locker locker(_lock);
    qCDebug(controllers) << "Attempting to enable mapping " << mappingName;
    auto iterator = _mappingsByName.find(mappingName);
    if (_mappingsByName.end() == iterator) {
        qCWarning(controllers) << "Request to enable / disable unknown mapping " << mappingName;
        return;
    }

    auto mapping = iterator->second;
    if (enable) {
        enableMapping(mapping);
    } else {
        disableMapping(mapping);
    }
}

float UserInputMapper::getValue(const Endpoint::Pointer& endpoint, bool peek) {
    return peek ? endpoint->peek() : endpoint->value();
}

float UserInputMapper::getValue(const Input& input) const {
    Locker locker(_lock);
    auto endpoint = endpointFor(input);
    if (!endpoint) {
        return 0;
    }
    return endpoint->value();
}

Pose UserInputMapper::getPose(const Endpoint::Pointer& endpoint, bool peek) {
    if (!endpoint->isPose()) {
        return Pose();
    }
    return peek ? endpoint->peekPose() : endpoint->pose();
}

Pose UserInputMapper::getPose(const Input& input) const {
    Locker locker(_lock);
    auto endpoint = endpointFor(input);
    if (!endpoint) {
        return Pose();
    }
    return getPose(endpoint);
}

Mapping::Pointer UserInputMapper::loadMapping(const QString& jsonFile) {
    Locker locker(_lock);
    if (jsonFile.isEmpty()) {
        return Mapping::Pointer();
    }
    QString json;
    {
        QFile file(jsonFile);
        if (file.open(QFile::ReadOnly | QFile::Text)) {
            json = QTextStream(&file).readAll();
        }
        file.close();
    }
    return parseMapping(json);
}



static const QString JSON_NAME = QStringLiteral("name");
static const QString JSON_CHANNELS = QStringLiteral("channels");
static const QString JSON_CHANNEL_FROM = QStringLiteral("from");
static const QString JSON_CHANNEL_DEBUG = QStringLiteral("debug");
static const QString JSON_CHANNEL_PEEK = QStringLiteral("peek");
static const QString JSON_CHANNEL_WHEN = QStringLiteral("when");
static const QString JSON_CHANNEL_TO = QStringLiteral("to");
static const QString JSON_CHANNEL_FILTERS = QStringLiteral("filters");

Endpoint::Pointer UserInputMapper::parseEndpoint(const QJsonValue& value) {
    Endpoint::Pointer result;
    if (value.isString()) {
        auto input = findDeviceInput(value.toString());
        result = endpointFor(input);
    } else if (value.isArray()) {
        return parseAny(value);
    } else if (value.isObject()) {
        auto axisEndpoint = parseAxis(value);
        if (axisEndpoint) {
            return axisEndpoint;
        }
        // if we have other types of endpoints that are objects, follow the axisEndpoint example, and place them here

        // Endpoint is defined as an object, we expect a js function then
        return Endpoint::Pointer();
    }

    if (!result) {
        qWarning() << "Invalid endpoint definition " << value;
    }
    return result;
}


Conditional::Pointer UserInputMapper::conditionalFor(const QJSValue& condition) {
    return Conditional::Pointer();
}

Conditional::Pointer UserInputMapper::conditionalFor(const QScriptValue& condition) {
    if (condition.isArray()) {
        int length = condition.property("length").toInteger();
        Conditional::List children;
        for (int i = 0; i < length; i++) {
            Conditional::Pointer destination = conditionalFor(condition.property(i));
            if (!destination) {
                return Conditional::Pointer();
            }
            children.push_back(destination);
        }
        return std::make_shared<AndConditional>(children);
    }

    if (condition.isNumber()) {
        return conditionalFor(Input(condition.toInt32()));
    }

    if (condition.isFunction()) {
        return std::make_shared<ScriptConditional>(condition);
    }

    qWarning() << "Unsupported conditional type " << condition.toString();
    return Conditional::Pointer();
}

Conditional::Pointer UserInputMapper::conditionalFor(const Input& inputId) const {
    Locker locker(_lock);
    auto iterator = _endpointsByInput.find(inputId);
    if (_endpointsByInput.end() == iterator) {
        qWarning() << "Unknown input: " << QString::number(inputId.getID(), 16);
        return Conditional::Pointer();
    }
    return std::make_shared<EndpointConditional>(iterator->second);
}

Conditional::Pointer UserInputMapper::parseConditional(const QJsonValue& value) {
    if (value.isArray()) {
        // Support "when" : [ "GamePad.RB", "GamePad.LB" ]
        Conditional::List children;
        for (auto arrayItem : value.toArray()) {
            Conditional::Pointer childConditional = parseConditional(arrayItem);
            if (!childConditional) {
                return Conditional::Pointer();
            }
            children.push_back(childConditional);
        }
        return std::make_shared<AndConditional>(children);
    } else if (value.isString()) {
        // Support "when" : "GamePad.RB"
        auto input = findDeviceInput(value.toString());
        auto endpoint = endpointFor(input);
        if (!endpoint) {
            return Conditional::Pointer();
        }

        return std::make_shared<EndpointConditional>(endpoint);
    }

    return Conditional::parse(value);
}

Filter::Pointer UserInputMapper::parseFilter(const QJsonValue& value) {
    Filter::Pointer result;
    if (value.isString()) {
        result = Filter::getFactory().create(value.toString());
    } else if (value.isObject()) {
        result = Filter::parse(value.toObject());
    } 

    if (!result) {
        qWarning() << "Invalid filter definition " << value;
    }
      
    return result;
}

Filter::List UserInputMapper::parseFilters(const QJsonValue& value) {
    if (value.isNull()) {
        return Filter::List();
    }

    if (value.isArray()) {
        Filter::List result;
        auto filtersArray = value.toArray();
        for (auto filterValue : filtersArray) {
            Filter::Pointer filter = parseFilter(filterValue);
            if (!filter) {
                return Filter::List();
            }
            result.push_back(filter);
        }
        return result;
    } 

    Filter::Pointer filter = parseFilter(value);
    if (!filter) {
        return Filter::List();
    }
    return Filter::List({ filter });
}

Endpoint::Pointer UserInputMapper::parseDestination(const QJsonValue& value) {
    if (value.isArray()) {
        ArrayEndpoint::Pointer result = std::make_shared<ArrayEndpoint>();
        for (auto arrayItem : value.toArray()) {
            Endpoint::Pointer destination = parseEndpoint(arrayItem);
            if (!destination) {
                return Endpoint::Pointer();
            }
            result->_children.push_back(destination);
        }
        return result;
    } 
    
    return parseEndpoint(value);
}

Endpoint::Pointer UserInputMapper::parseAxis(const QJsonValue& value) {
    if (value.isObject()) {
        auto object = value.toObject();
        if (object.contains("makeAxis")) {
            auto axisValue = object.value("makeAxis");
            if (axisValue.isArray()) {
                auto axisArray = axisValue.toArray();
                static const int AXIS_ARRAY_SIZE = 2; // axis can only have 2 children
                if (axisArray.size() == AXIS_ARRAY_SIZE) {
                    Endpoint::Pointer first = parseEndpoint(axisArray.first());
                    Endpoint::Pointer second = parseEndpoint(axisArray.last());
                    if (first && second) {
                        return std::make_shared<CompositeEndpoint>(first, second);
                    }
                }
            }
        }
    }
    return Endpoint::Pointer();
}

Endpoint::Pointer UserInputMapper::parseAny(const QJsonValue& value) {
    if (value.isArray()) {
        Endpoint::List children;
        for (auto arrayItem : value.toArray()) {
            Endpoint::Pointer destination = parseEndpoint(arrayItem);
            if (!destination) {
                return Endpoint::Pointer();
            }
            children.push_back(destination);
        }
        return std::make_shared<AnyEndpoint>(children);
    }
    return Endpoint::Pointer();
}

Endpoint::Pointer UserInputMapper::parseSource(const QJsonValue& value) {
    if (value.isObject()) {
        auto axisEndpoint = parseAxis(value);
        if (axisEndpoint) {
            return axisEndpoint;
        }
        // if we have other types of endpoints that are objects, follow the axisEndpoint example, and place them here
    } else if (value.isArray()) {
        return parseAny(value);
    }
    return parseEndpoint(value);
}

Route::Pointer UserInputMapper::parseRoute(const QJsonValue& value) {
    if (!value.isObject()) {
        return Route::Pointer();
    }

    auto obj = value.toObject();
    Route::Pointer result = std::make_shared<Route>();

    result->json = QString(QJsonDocument(obj).toJson());
    result->source = parseSource(obj[JSON_CHANNEL_FROM]);
    result->debug = obj[JSON_CHANNEL_DEBUG].toBool();
    result->debug = obj[JSON_CHANNEL_PEEK].toBool();
    if (!result->source) {
        qWarning() << "Invalid route source " << obj[JSON_CHANNEL_FROM];
        return Route::Pointer();
    }


    result->destination = parseDestination(obj[JSON_CHANNEL_TO]);
    if (!result->destination) {
        qWarning() << "Invalid route destination " << obj[JSON_CHANNEL_TO];
        return Route::Pointer();
    }

    if (result->source == result->destination) {
        qWarning() << "Loopback routes not supported " << obj;
        return Route::Pointer();
    }

    if (obj.contains(JSON_CHANNEL_WHEN)) {
        auto conditionalsValue = obj[JSON_CHANNEL_WHEN];
        result->conditional = parseConditional(conditionalsValue);
        if (!result->conditional) {
            qWarning() << "Invalid route conditionals " << conditionalsValue;
            return Route::Pointer();
        }
    }

    if (obj.contains(JSON_CHANNEL_FILTERS)) {
        auto filtersValue = obj[JSON_CHANNEL_FILTERS];
        result->filters = parseFilters(filtersValue);
        if (result->filters.empty()) {
            qWarning() << "Invalid route filters " << filtersValue;
            return Route::Pointer();
        }
    }

    return result;
}

Mapping::Pointer UserInputMapper::parseMapping(const QJsonValue& json) {
    if (!json.isObject()) {
        return Mapping::Pointer();
    }

    auto obj = json.toObject();
    auto mapping = std::make_shared<Mapping>("default");
    mapping->name = obj[JSON_NAME].toString();
    const auto& jsonChannels = obj[JSON_CHANNELS].toArray();
    for (const auto& channelIt : jsonChannels) {
        Route::Pointer route = parseRoute(channelIt);
        if (!route) {
            qWarning() << "Couldn't parse route";
            continue;
        }
        mapping->routes.push_back(route);
    }
    return mapping;
}

Mapping::Pointer UserInputMapper::parseMapping(const QString& json) {
    Mapping::Pointer result;
    QJsonObject obj;
    QJsonParseError error;
    QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8(), &error);
    // check validity of the document
    if (doc.isNull()) {
        qDebug() << "Invalid JSON...\n";
        qDebug() << error.errorString();
        qDebug() << "JSON was:\n" << json << endl;
        return Mapping::Pointer();
    }

    if (!doc.isObject()) {
        qWarning() << "Mapping json Document is not an object" << endl;
        qDebug() << "JSON was:\n" << json << endl;
        return Mapping::Pointer();
    }
    return parseMapping(doc.object());
}

template <typename T>
bool hasDebuggableRoute(const T& routes) {
    for (auto route : routes) {
        if (route->debug) {
            return true;
        }
    }
    return false;
}


void UserInputMapper::enableMapping(const Mapping::Pointer& mapping) {
    Locker locker(_lock);
    // New routes for a device get injected IN FRONT of existing routes.  Routes
    // are processed in order so this ensures that the standard -> action processing 
    // takes place after all of the hardware -> standard or hardware -> action processing
    // because standard -> action is the first set of routes added.
    Route::List standardRoutes = mapping->routes;
    standardRoutes.remove_if([](const Route::Pointer& value) {
        return (value->source->getInput().device != STANDARD_DEVICE);
    });
    _standardRoutes.insert(_standardRoutes.begin(), standardRoutes.begin(), standardRoutes.end());

    Route::List deviceRoutes = mapping->routes;
    deviceRoutes.remove_if([](const Route::Pointer& value) {
        return (value->source->getInput().device == STANDARD_DEVICE);
    });
    _deviceRoutes.insert(_deviceRoutes.begin(), deviceRoutes.begin(), deviceRoutes.end());

    if (!debuggableRoutes) {
        debuggableRoutes = hasDebuggableRoute(_deviceRoutes) || hasDebuggableRoute(_standardRoutes);
    }
}

void UserInputMapper::disableMapping(const Mapping::Pointer& mapping) {
    Locker locker(_lock);
    const auto& deviceRoutes = mapping->routes;
    std::set<Route::Pointer> routeSet(deviceRoutes.begin(), deviceRoutes.end());
    _deviceRoutes.remove_if([&](const Route::Pointer& value){
        return routeSet.count(value) != 0;
    });
    _standardRoutes.remove_if([&](const Route::Pointer& value) {
        return routeSet.count(value) != 0;
    });

    if (debuggableRoutes) {
        debuggableRoutes = hasDebuggableRoute(_deviceRoutes) || hasDebuggableRoute(_standardRoutes);
    }
}

}
