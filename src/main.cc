#include <node_version.h>


#if NODE_MAJOR_VERSION == 0
	#if   NODE_MINOR_VERSION == 12
		#include "main-v12.cc"
	#elif NODE_MINOR_VERSION == 13
		#include "main-v12.cc"
	#else
		#define UNSUPPORT_FC_NATIVE
	#endif
#elif NODE_MAJOR_VERSION == 5
	#define UNSUPPORT_FC_NATIVE
#else
	#define UNSUPPORT_FC_NATIVE
#endif


#ifdef UNSUPPORT_FC_NATIVE
	#include "main-unsupport.cc"
#endif


#ifdef _WIN32_WINNT
#include <windows.h>
static LONG WINAPI exception_handle(EXCEPTION_POINTERS *pe) {
	PEXCEPTION_RECORD r = pe->ExceptionRecord;
  cout << "\n---- system exception. [" << endl;
	cout << "  code: " << PVOID(r->ExceptionCode) << endl;
	cout << "  flag: " << PVOID(r->ExceptionFlags) << endl;
	cout << "  addr: " << r->ExceptionAddress << endl;
	cout << "  parm: " << r->NumberParameters << endl;
	for (UINT i=0; i<r->NumberParameters; ++i) {
		cout << "    P" << i << ": " << PVOID(r->ExceptionInformation[i]) << endl;
	}
	cout << "]\n" << endl;
  return 1;
}

void hook_error() {
	// cout << "Win 32 error hook.";
	SetUnhandledExceptionFilter(exception_handle);
}
#else
void hook_error() {
	// cout << "No error hook" << endl;
}
#endif
