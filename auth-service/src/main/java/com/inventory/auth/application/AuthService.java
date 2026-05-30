package com.inventory.auth.application;

import com.inventory.auth.application.dto.*;
import com.inventory.auth.domain.model.*;
import com.inventory.auth.domain.model.OtpToken.OtpPurpose;
import com.inventory.auth.domain.repository.*;
import com.inventory.auth.infrastructure.email.EmailService;
import com.inventory.auth.infrastructure.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository         userRepository;
    private final OtpTokenRepository     otpTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider       jwtTokenProvider;
    private final PasswordEncoder        passwordEncoder;
    private final EmailService           emailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public OtpRequestResponse initiateSignup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("An account with this email already exists.");
        otpTokenRepository.deleteByEmail(request.getEmail());
        userRepository.findByEmail(request.getEmail()).ifPresent(u -> {
            if (!u.isActive()) userRepository.deleteById(u.getId());
        });
        User pending = User.builder()
                .email(request.getEmail()).fullName(request.getFullName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole()).active(false).build();
        userRepository.save(pending);
        return sendOtp(request.getEmail(), OtpPurpose.SIGNUP, "SIGNUP");
    }

    @Transactional
    public TokenPairResponse verifySignup(OtpVerifyRequest request) {
        OtpToken token = findValidOtp(request.getEmail(), request.getOtp(), OtpPurpose.SIGNUP);
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Account not found."));
        user.setActive(true);
        userRepository.save(user);
        token.setUsed(true);
        otpTokenRepository.save(token);
        return buildTokenPair(user);
    }

    @Transactional
    public OtpRequestResponse initiateLogin(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));
        if (!user.isActive())
            throw new RuntimeException("Account is not verified or has been disabled.");
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw new RuntimeException("Invalid email or password.");
        otpTokenRepository.deleteByEmail(request.getEmail());
        return sendOtp(request.getEmail(), OtpPurpose.LOGIN, "LOGIN");
    }

    @Transactional
    public TokenPairResponse verifyLogin(OtpVerifyRequest request) {
        OtpToken token = findValidOtp(request.getEmail(), request.getOtp(), OtpPurpose.LOGIN);
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found."));
        token.setUsed(true);
        otpTokenRepository.save(token);
        return buildTokenPair(user);
    }

    @Transactional
    public OtpRequestResponse forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found for this email."));
        otpTokenRepository.deleteByEmail(request.getEmail());
        return sendOtp(request.getEmail(), OtpPurpose.FORGOT_PASSWORD, "RESET");
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        OtpToken token = findValidOtp(request.getEmail(), request.getOtp(), OtpPurpose.FORGOT_PASSWORD);
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found."));
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        token.setUsed(true);
        otpTokenRepository.save(token);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    /** Accepts raw refresh-token string read from HttpOnly cookie. */
    @Transactional
    public TokenPairResponse refreshAccessToken(String rawRefreshToken) {
        RefreshToken rt = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token."));
        if (rt.isRevoked()) throw new RuntimeException("Refresh token revoked.");
        if (rt.isExpired()) throw new RuntimeException("Refresh token expired.");
        User user = userRepository.findById(rt.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found."));
        if (!user.isActive()) throw new RuntimeException("Account is disabled.");
        rt.setRevoked(true);
        refreshTokenRepository.save(rt);
        return buildTokenPair(user);
    }

    @Transactional
    public void logout(String userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    public UserResponse createUser(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already in use.");
        User user = User.builder()
                .email(request.getEmail()).fullName(request.getFullName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole()).active(true).build();
        return toResponse(userRepository.save(user));
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public void toggleActive(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found."));
        user.setActive(!user.isActive());
        userRepository.save(user);
    }

    private OtpRequestResponse sendOtp(String email, OtpPurpose purpose, String purposeLabel) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        otpTokenRepository.save(OtpToken.builder()
                .email(email).code(code).purpose(purpose)
                .expiresAt(LocalDateTime.now().plusMinutes(10)).used(false).build());
        emailService.sendOtp(email, code, purposeLabel);
        return OtpRequestResponse.builder()
                .email(email)
                .message("Verification code sent to " + email)
                .devOtp(emailService.isEmailConfigured() ? null : code)
                .build();
    }

    private OtpToken findValidOtp(String email, String code, OtpPurpose purpose) {
        OtpToken token = otpTokenRepository.findLatestByEmailAndPurpose(email, purpose)
                .orElseThrow(() -> new RuntimeException("No verification code found."));
        if (token.isUsed())    throw new RuntimeException("Code already used.");
        if (token.isExpired()) throw new RuntimeException("Code expired.");
        if (!token.getCode().equals(code)) throw new RuntimeException("Incorrect code.");
        return token;
    }

    public TokenPairResponse buildTokenPair(User user) {
        String access  = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refresh = UUID.randomUUID().toString();
        refreshTokenRepository.save(RefreshToken.builder()
                .token(refresh).userId(user.getId())
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false).build());
        return TokenPairResponse.builder()
                .accessToken(access).refreshToken(refresh)
                .userId(user.getId()).email(user.getEmail())
                .fullName(user.getFullName()).role(user.getRole().name()).build();
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
                .role(u.getRole().name()).active(u.isActive()).createdAt(u.getCreatedAt()).build();
    }
}
