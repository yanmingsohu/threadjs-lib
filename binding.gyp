{
  "targets": [
    {
      "target_name"	: "threadnv",
      "sources"		: [
        "src/serialize.cc",
        "src/data.cc",
        "src/tools.cc",
        "src/timeImpl.cc",
        "src/main.cc"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      'cflags'		: ['-fexceptions'],
      'cflags_cc'	: ['-fexceptions', '-std=c++11'],
      'win_delay_load_hook': 'false',
      'conditions': [
        ['OS=="win"', {
            'cflags' : ['/source-charset:utf-8'],
        }]
      ]
    }
  ]
}
