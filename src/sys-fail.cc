#include <node.h>
#include <iostream>
#include "sys-fail.h"

using namespace std;


#ifdef _WIN32_WINNT
#include <windows.h>
#include <sstream>
static LONG WINAPI exception_handle(EXCEPTION_POINTERS *pe) {
	std::stringbuf buf;
	std::ostream out(&buf);

	PEXCEPTION_RECORD r = pe->ExceptionRecord;
  out << "\n---- SYSTEM EXCEPTION. [" << endl;
	out << "  code: " << PVOID(r->ExceptionCode) << endl;
	out << "  flag: " << PVOID(r->ExceptionFlags) << endl;
	out << "  addr: " << r->ExceptionAddress << endl;
	out << "  parm: " << r->NumberParameters << endl;
	for (UINT i=0; i<r->NumberParameters; ++i) {
		out << "    P" << i << ": " << PVOID(r->ExceptionInformation[i]) << endl;
	}
	out << "]\n" << endl;
	cout << buf.str();
  return 1;
}

void hook_error() {
	// cout << "Win 32 error hook.";
	SetUnhandledExceptionFilter(exception_handle);
}

#else /* _WIN32_WINNT end, LINUX begin */

#include <execinfo.h>
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>

void dump(int signo) {
  void *array[10];
  size_t size;
  char **strings;
  size_t i;

  size = backtrace(array, 10);
  strings = backtrace_symbols(array, size);

  printf("Obtained %zd stack frames.\n", size);

  for (i = 0; i < size; i++)
      printf("  %02d  %s\n", i, strings[i]);

  free(strings);
  exit(0);
}

void hook_error() {
	// cout << "Linux error hook" << endl;
  signal(SIGSEGV, &dump);
}
#endif
