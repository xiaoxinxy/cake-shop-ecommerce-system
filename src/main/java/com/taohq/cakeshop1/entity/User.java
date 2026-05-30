package com.taohq.cakeshop1.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;

@Data
public class User {

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String username;

    private String email;

    private String password;

    private String name;

    private String phone;

    private String address;

    private Boolean isadmin;

    private Boolean isvalidate;
}
