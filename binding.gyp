{
  "targets": [
    {
      "target_name"	: "threadnv",
      "sources"		: [
        "src/serialize.cc",
        "src/tools.cc",
        "src/timeImpl.cc",
        "src/main.cc"
      ],
      "include_dirs": [ ],
      'cflags'		: ['-fexceptions'],
      'cflags_cc'	: ['-fexceptions', '-std=c++11'],
      'win_delay_load_hook': 'false'
    }
  ]
}
