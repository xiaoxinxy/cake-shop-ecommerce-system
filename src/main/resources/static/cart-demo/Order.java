package com.huoll.entity;

import java.util.HashMap;
import java.util.List;

public class Order
{
    private Integer id;
    private float total=0.0f;//总价钱
    private Integer amount=0;//总商品数
    private int status;//订单状态：4种：未付款，已付款，已发货，已完成。
    private int paytype;//付款方式：3种：微信，支付宝，货到付款。
    private String name;
    private String phone;
    private String address;
    private String datetime;
    private int user_id;
    private User user;
    private List<OrderItem> itemList;//订单对应的详情

    //模拟购物车功能
    HashMap<Integer,OrderItem> itemMap = new HashMap<>();
    //向购物车添加商品
    public void addGoods(Goods g)
    {
        if(itemMap.containsKey(g.getId()))
        {
            OrderItem item = itemMap.get(g.getId());//根据Id获取已有的商品
            int c = item.getAmount()+1;//已有商品数量+1
            item.setAmount(c);//重新设定已有商品的数量
        }
        else
        {
            OrderItem item = new OrderItem(g.getPrice(), 1, g.getId(), id, g);
            itemMap.put(g.getId(),item);//<商品Id,订单详情属性）>  购物车中添加商品
        }
        amount++;//商品总数+1
        total = total + g.getPrice();//订单总金额增加
    }

    public void lessenGoods(int goodsid)
    {
        if (itemMap.containsKey(goodsid))
        {
            OrderItem item = itemMap.get(goodsid);//根据Id获取已有的商品
            int c = item.getAmount() - 1;//已有商品数量-1
            item.setAmount(c);//重新设定已有商品的数量
            amount--;//商品总数-1
            total = total - item.getPrice();//订单总金额减少
            if(item.getAmount()<=0)
            {
                itemMap.remove(goodsid);
            }
        }
    }

    public void deleteGoods(int goodsid)
    {
        if(itemMap.containsKey(goodsid))
        {
            OrderItem item = itemMap.get(goodsid);
            amount = amount - item.getAmount();
            total = total - item.getAmount() * item.getPrice();
            itemMap.remove(goodsid);
        }
    }


    public List<OrderItem> getItemList() {
        return itemList;
    }

    public void setItemList(List<OrderItem> itemList) {
        this.itemList = itemList;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public float getTotal() {
        return total;
    }

    public void setTotal(float total) {
        this.total = total;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public int getPaytype() {
        return paytype;
    }

    public void setPaytype(int paytype) {
        this.paytype = paytype;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getDatetime() {
        return datetime;
    }

    public void setDatetime(String datetime) {
        this.datetime = datetime;
    }

    public int getUser_id() {
        return user_id;
    }

    public void setUser_id(int user_id) {
        this.user_id = user_id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public HashMap<Integer, OrderItem> getItemMap() {
        return itemMap;
    }

    public void setItemMap(HashMap<Integer, OrderItem> itemMap) {
        this.itemMap = itemMap;
    }

    @Override
    public String toString() {
        return "Order{" +
                "id=" + id +
                ", total=" + total +
                ", amount=" + amount +
                ", status=" + status +
                ", paytype=" + paytype +
                ", name='" + name + '\'' +
                ", phone='" + phone + '\'' +
                ", address='" + address + '\'' +
                ", datetime='" + datetime + '\'' +
                ", user_id=" + user_id +
                ", user=" + user +
                ", itemMap=" + itemMap +
                '}';
    }
}
