#include <jni.h>
#include "NitroImageMarkerOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::nitroimagemarker::initialize(vm);
}
