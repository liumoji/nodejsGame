export interface xyx_header{
  cmd: string;
  seq: number;
  ret: any;
  uid: number;
}


export interface sc_error{
  error_code: number;
  error_desc: string;
  errro_param: any;
}


export interface cs_login{
  tad: any;
  keycode: string;
  nick: string;
  pwd: string;
}


export interface sc_login{
  token: string;
  ts: number;
}


export interface user_rank{
  uid: number;
  nick: string;
  head: string;
  score: number;
}


export interface cs_get_rank_list{
  type: number;
  start_page: number;
  num: number;
}


export interface sc_get_rank_list{
  start_page: number;
  type: number;
  rank_list: user_rank[];
}

