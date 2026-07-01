package com.inventory.stock.config;

import com.amazonaws.xray.javax.servlet.AWSXRayServletFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class XRayConfig {

    @Bean
    public FilterRegistrationBean<AWSXRayServletFilter> xRayFilter() {
        FilterRegistrationBean<AWSXRayServletFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new AWSXRayServletFilter("inventory-service"));
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
