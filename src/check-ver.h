#include <node_version.h>


//
// 定义不支持的 node 版本
//
#if NODE_MAJOR_VERSION == 0
	#if NODE_MINOR_VERSION < 12
		#define UNSUPPORT_FC_NATIVE
	#endif
#elif NODE_MAJOR_VERSION < 6
	#define UNSUPPORT_FC_NATIVE
#endif


#ifdef UNSUPPORT_FC_NATIVE
#pragma message("This node version: " NODE_VERSION_STRING)
#error Cannot support this node version.
#endif
