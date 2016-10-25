#include "serialize.h"
#include <iostream>


static inline JData* create_data_with_type(Isolate *iso,
      const Local<Context> &context, const Local<Value> &v);


class JUndefined : public JData {
public:
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return v8::Undefined(iso);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {}
};


class JNull : public JData {
public:
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return v8::Null(iso);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {}
};


class JFunction : public JNull {
};


class JBoolean : public JData {
protected:
  bool value;
public:
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return Boolean::New(iso, value);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    value = jd->IsTrue();
  }
};


class JBooleanObject : public JBoolean {
public:
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    value = Local<BooleanObject>::Cast(jd)->ValueOf();
  }
};


class JString : public JData {
protected:
  char *value;
  int len;
public:
  JString() : value(0), len(0) {}
  ~JString() {
    DEL_ARRAY(value);
    len = 0;
  }

  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return v8::String::NewFromUtf8(iso, value, String::kNormalString, len-1);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    v8val_to_char(jd, value, len);
  }
};


class JStringObject : public JString {
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    Local<String> str = Local<StringObject>::Cast(jd)->ValueOf();
    v8val_to_char(str, value, len);
  }
};


class JRegExp : public JData {
  char *value;
  int len;
  RegExp::Flags flags;
public:
  JRegExp() : value(0), len(0) {}
  ~JRegExp() {
    DEL_ARRAY(value);
    len = 0;
  }
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    Local<String> src = String::NewFromUtf8(iso, value, String::kNormalString, len-1);
    return RegExp::New(src, flags);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    Local<RegExp> reg = Local<RegExp>::Cast(jd);
    Local<String> src = reg->GetSource();
    v8val_to_char(src, value, len);
    flags = reg->GetFlags();
  }
};


class JInt32 : public JData {
  int32_t value;
public:
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return v8::Integer::New(iso, value);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    value = jd->Int32Value();
  }
};


class JUint32 : public JData {
  uint32_t value;
public:
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return v8::Integer::NewFromUnsigned(iso, value);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    value = jd->Uint32Value();
  }
};


class JDate : public JData {
  double value;
public:
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return v8::Date::New(iso, value);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    value = Local<Date>::Cast(jd)->ValueOf();
  }
};


class JNumber : public JData {
protected:
  double value;
public:
  Local<Value> restore(Isolate *iso, const Local<Context> &context) {
    return v8::Number::New(iso, value);
  }
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    value = jd->NumberValue();
  }
};


class JNumberObject : public JNumber {
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
    value = Local<NumberObject>::Cast(jd)->ValueOf();
  }
};


class JArray : public JData {
  uint32_t size;
  JData **value;
public:
  JArray() : size(0), value(0) {}
  ~JArray();
  Local<Value> restore(Isolate *iso, const Local<Context> &context);
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd);
};


class JObject : public JData {
  uint32_t size;
  JData **value;
  char **name;
public:
  JObject() : size(0), value(0), name(0) {}
  ~JObject();
  Local<Value> restore(Isolate *iso, const Local<Context> &context);
  void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd);
};


JArray::~JArray() {
  for (uint32_t i=0; i<size; ++i) {
    delete value[i];
    value[i] = 0;
  }
  delete [] value;
  size = 0;
}


Local<Value> JArray::restore(Isolate *iso, const Local<Context> &context) {
  Local<Array> ret = Array::New(iso, size);
  for (uint32_t i=0; i<size; ++i) {
    Local<Value> v = value[i]->restore(iso, context);
    ret->Set(i, v);
  }
  return ret;
}


void JArray::set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
  Local<Array> arr = Local<Array>::Cast(jd);
  size = arr->Length();
  value = new JData*[size];

  for (uint32_t i=0; i<size; ++i) {
    Local<Value> v = arr->Get(i);
    value[i] = create_data_with_type(iso, context, v);
  }
}


JObject::~JObject() {
  for (uint32_t i=0; i<size; ++i) {
    delete value[i];
    delete [] name[i];
    value[i] = 0;
    name[i] = 0;
  }
  delete [] value;
  delete [] name;
  size = 0;
}


Local<Value> JObject::restore(Isolate *iso, const Local<Context> &context) {
  Local<Object> ret = Object::New(iso);
  for (uint32_t i=0; i<size; ++i) {
    Local<Value> k = String::NewFromUtf8(iso, name[i]);
    Local<Value> v = value[i]->restore(iso, context);
    ret->Set(k, v);
  }
  return ret;
}


void JObject::set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) {
  Local<Object> obj = Local<Object>::Cast(jd);
  Local<Array> names = obj->GetPropertyNames();
  size = names->Length();
  value = new JData*[size];
  name = new char*[size];
  int tmp;

  for (uint32_t i=0; i<size; ++i) {
    Local<Value> k = names->Get(i);
    Local<Value> v = obj->Get(k);
    if (k->IsString()) {
      v8val_to_char(k, name[i], tmp);
    } else {
      int64_t ik = k->IntegerValue();
      name[i] = new char[20];
      sprintf(name[i], "%lld", ik);
    }
    value[i] = create_data_with_type(iso, context, v);
  }
}


static inline JData* create_data_with_type(Isolate *iso,
      const Local<Context> &context, const Local<Value> &v) {

  JData *jdata = 0;

  #define ELS_TYPE(T)  else IF_TYPE(T)
  #define IF_TYPE(T)   if (v->Is##T()) { jdata = new J##T();  }

  IF_TYPE(Undefined)
  ELS_TYPE(Null)
  ELS_TYPE(Boolean)
  ELS_TYPE(BooleanObject)
  ELS_TYPE(String)
  ELS_TYPE(StringObject)
  ELS_TYPE(RegExp)
  ELS_TYPE(Int32)
  ELS_TYPE(Uint32)
  ELS_TYPE(Number)
  ELS_TYPE(NumberObject)
  ELS_TYPE(Date)
  ELS_TYPE(Array)
  ELS_TYPE(Function)
  ELS_TYPE(Object)
  else { jdata = new JNull(); }

  jdata->set(iso, context, v);
  return jdata;
}


void j_test_ser(const FunctionCallbackInfo<Value>& args) {
  Isolate *iso = args.GetIsolate();
  HandleScope scope(iso);
  Local<Context> context = iso->GetCurrentContext();

  Serialized ser;
  js_save(iso, context, &ser, args[0]);
  Local<Value> ret = js_load(iso, context, &ser);

  args.GetReturnValue().Set(ret);
}


void js_save(Isolate *iso, const Local<Context> &context, Serialized *ser, const Local<Value> &jsobj) {
  JData *jdata = create_data_with_type(iso, context, jsobj);
  ser->set(jdata);
}


Local<Value> js_load(Isolate *iso, Local<Context> &context, Serialized *ser) {
  return ser->get().restore(iso, context);
}
