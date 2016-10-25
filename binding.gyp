{
  "targets": [
    {
      "target_name"	: "threadnv",
      "sources"		: [ "src/main.cc", "src/serialize.cc", "src/tools.cc" ],
      "include_dirs": [ ],
      'cflags'		: ['-fexceptions'],
      'cflags_cc'	: ['-fexceptions'],
      'win_delay_load_hook': 'false'
    }
  ]
}
