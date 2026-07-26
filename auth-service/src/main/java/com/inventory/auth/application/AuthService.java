package com.inventory.auth.application;

import com.inventory.auth.application.dto.*;
import com.inventory.auth.domain.model.*;
import com.inventory.auth.domain.model.OtpToken.OtpPurpose;
import com.inventory.auth.domain.repository.*;
import com.inventory.auth.infrastructure.email.EmailService;
import com.inventory.shared.security.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository         userRepository;
    private final OtpTokenRepository     otpTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder        passwordEncoder;
    private final EmailService           emailService;
    private final JwtUtil                sessionJwtUtil;
    private final JwtUtil                accessJwtUtil;
    private final JwtUtil                refreshJwtUtil;

    public AuthService(UserRepository userRepository,
                       OtpTokenRepository otpTokenRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       @Qualifier("sessionJwtUtil") JwtUtil sessionJwtUtil,
                       @Qualifier("accessJwtUtil")  JwtUtil accessJwtUtil,
                       @Qualifier("refreshJwtUtil") JwtUtil refreshJwtUtil) {
        this.userRepository         = userRepository;
        this.otpTokenRepository     = otpTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder        = passwordEncoder;
        this.emailService           = emailService;
        this.sessionJwtUtil         = sessionJwtUtil;
        this.accessJwtUtil          = accessJwtUtil;
        this.refreshJwtUtil         = refreshJwtUtil;
    }

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_ADMIN_COUNT = 2;
    private static final String PURPOSE_CLAIM = "purpose";
    private static final String JTI_CLAIM     = "jti";

    @Transactional
    public OtpRequestResponse initiateSignup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("An account with this email already exists.");
        enforcePublicSignupAdminRule(request.getRole());
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
        validateSessionToken(request.getSessionToken(), request.getEmail(), OtpPurpose.SIGNUP);
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
        validateSessionToken(request.getSessionToken(), request.getEmail(), OtpPurpose.LOGIN);
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
        validateSessionToken(request.getSessionToken(), request.getEmail(), OtpPurpose.FORGOT_PASSWORD);
        OtpToken token = findValidOtp(request.getEmail(), request.getOtp(), OtpPurpose.FORGOT_PASSWORD);
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found."));
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        token.setUsed(true);
        otpTokenRepository.save(token);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    @Transactional
    public TokenPairResponse refreshAccessToken(String rawRefreshToken) {
        Claims claims;
        try {
            claims = refreshJwtUtil.validateAndParse(rawRefreshToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw new RuntimeException("Invalid refresh token.");
        }
        String userId = claims.getSubject();
        String jti     = claims.get(JTI_CLAIM, String.class);
        if (jti == null) throw new RuntimeException("Invalid refresh token.");

        RefreshToken rt = refreshTokenRepository.findByToken(jti)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token."));

        if (rt.isRevoked()) {

            refreshTokenRepository.deleteByUserId(userId);
            throw new RuntimeException(
                    "Refresh token reuse detected — all sessions have been revoked. Please log in again.");
        }
        if (rt.isExpired()) throw new RuntimeException("Refresh token expired.");

        User user = userRepository.findById(userId)
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
        enforceAdminLimit(request.getRole());
        User user = User.builder()
                .email(request.getEmail()).fullName(request.getFullName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole()).active(true).build();
        return toResponse(userRepository.save(user));
    }

    public boolean adminExists() {
        return userRepository.countByRole(Role.ADMIN) > 0;
    }

    private void enforceAdminLimit(Role role) {
        if (role == Role.ADMIN && userRepository.countByRole(Role.ADMIN) >= MAX_ADMIN_COUNT) {
            throw new RuntimeException(
                    "Maximum number of admin accounts (" + MAX_ADMIN_COUNT + ") has already been reached.");
        }
    }

    private void enforcePublicSignupAdminRule(Role role) {
        if (role == Role.ADMIN && userRepository.countByRole(Role.ADMIN) > 0) {
            throw new RuntimeException(
                    "Admin accounts can only be created by an existing administrator. " +
                    "Please sign up as a different role and ask an admin to grant access.");
        }
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

        String sessionToken = sessionJwtUtil.generateToken(email, Map.of(PURPOSE_CLAIM, purpose.name()));
        return OtpRequestResponse.builder()
                .email(email)
                .message("Verification code sent to " + email)
                .devOtp(emailService.isEmailConfigured() ? null : code)
                .sessionToken(sessionToken)
                .build();
    }

    private void validateSessionToken(String sessionToken, String expectedEmail, OtpPurpose expectedPurpose) {
        Claims claims;
        try {
            claims = sessionJwtUtil.validateAndParse(sessionToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw new RuntimeException("Session expired or invalid. Please request a new code.");
        }
        if (!claims.getSubject().equalsIgnoreCase(expectedEmail))
            throw new RuntimeException("Session does not match this email.");
        if (!expectedPurpose.name().equals(claims.get(PURPOSE_CLAIM, String.class)))
            throw new RuntimeException("Session does not match this action.");
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
        String access = accessJwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());

        String jti     = UUID.randomUUID().toString();
        String refresh = refreshJwtUtil.generateToken(user.getId(), Map.of(JTI_CLAIM, jti));
        refreshTokenRepository.save(RefreshToken.builder()
                .token(jti).userId(user.getId())
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
