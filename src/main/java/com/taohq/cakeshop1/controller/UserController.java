package com.taohq.cakeshop1.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.taohq.cakeshop1.entity.User;
import com.taohq.cakeshop1.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public Map<String, Object> register(User user, HttpSession session) {
        Map<String, Object> result = new HashMap<>();
        boolean exists = userService.count(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, user.getUsername())) > 0;
        if (exists) {
            result.put("success", false);
            result.put("message", "用户名已存在");
            return result;
        }
        user.setIsadmin(false);
        user.setIsvalidate(false);
        userService.save(user);
        session.setAttribute("loginUser", user);
        result.put("success", true);
        result.put("message", "注册成功");
        result.put("user", user);
        return result;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestParam String username,
                                     @RequestParam String password,
                                     HttpSession session) {
        Map<String, Object> result = new HashMap<>();
        User user = userService.getOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, username)
                .eq(User::getPassword, password)
                .last("limit 1"));
        if (user == null) {
            result.put("success", false);
            result.put("message", "用户名或密码错误");
            return result;
        }
        session.setAttribute("loginUser", user);
        result.put("success", true);
        result.put("message", "登录成功");
        result.put("user", user);
        return result;
    }

    @GetMapping("/current")
    public Map<String, Object> current(HttpSession session) {
        Map<String, Object> result = new HashMap<>();
        Object user = session.getAttribute("loginUser");
        result.put("login", user != null);
        result.put("user", user);
        return result;
    }

    @PostMapping("/profile")
    public Map<String, Object> updateProfile(User form, HttpSession session) {
        User loginUser = (User) session.getAttribute("loginUser");
        if (loginUser == null) {
            return Map.of("success", false, "message", "请先登录");
        }
        User user = userService.getById(loginUser.getId());
        if (user == null) {
            return Map.of("success", false, "message", "用户不存在");
        }
        user.setEmail(form.getEmail());
        user.setName(form.getName());
        user.setPhone(form.getPhone());
        user.setAddress(form.getAddress());
        userService.updateById(user);
        session.setAttribute("loginUser", user);
        return Map.of("success", true, "message", "资料已保存", "user", user);
    }

    @PostMapping("/password")
    public Map<String, Object> updatePassword(@RequestParam String oldPassword,
                                              @RequestParam String newPassword,
                                              HttpSession session) {
        User loginUser = (User) session.getAttribute("loginUser");
        if (loginUser == null) {
            return Map.of("success", false, "message", "请先登录");
        }
        User user = userService.getById(loginUser.getId());
        if (user == null) {
            return Map.of("success", false, "message", "用户不存在");
        }
        if (!user.getPassword().equals(oldPassword)) {
            return Map.of("success", false, "message", "原密码不正确");
        }
        if (newPassword == null || newPassword.length() < 3) {
            return Map.of("success", false, "message", "新密码至少 3 位");
        }
        user.setPassword(newPassword);
        userService.updateById(user);
        session.setAttribute("loginUser", user);
        return Map.of("success", true, "message", "密码已修改");
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpSession session) {
        session.invalidate();
        return Map.of("success", true);
    }
}
