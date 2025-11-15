// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IQuickSwapRouter.sol";
import "./interfaces/IStandardCLOB.sol";
import "./interfaces/ISomiArbVault.sol";

/**
 * @title SomiArbVault
 * @dev Reactive arbitrage vault that leverages Somnia Data Streams for real-time arbitrage execution
 * @notice This contract implements a comprehensive arbitrage strategy between QuickSwap AMM and Standard CLOB
 * @author SomiArb Team
 */
contract SomiArbVault is ISomiArbVault, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum basis points (10000 = 100%)
    uint256 public constant MAX_BPS = 10000;
    
    /// @notice Maximum management fee (500 = 5%)
    uint256 public constant MAX_MANAGEMENT_FEE = 500;
    
    /// @notice Maximum performance fee (2000 = 20%)
    uint256 public constant MAX_PERFORMANCE_FEE = 2000;
    
    /// @notice Minimum profit threshold in basis points (10 = 0.1%)
    uint256 public constant MIN_PROFIT_THRESHOLD = 10;
    
    /// @notice Maximum slippage tolerance (1000 = 10%)
    uint256 public constant MAX_SLIPPAGE = 1000;
    
    /// @notice Emergency withdrawal window (7 days)
    uint256 public constant EMERGENCY_WINDOW = 7 days;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Supported tokens for arbitrage
    mapping(address => bool) public supportedTokens;
    
    /// @notice User deposits mapping
    mapping(address => mapping(address => uint256)) public userDeposits;
    
    /// @notice Total deposits per token
    mapping(address => uint256) public totalDeposits;
    
    /// @notice Vault configuration
    VaultConfig public config;
    
    /// @notice Performance metrics
    PerformanceMetrics public performance;
    
    /// @notice Emergency state
    EmergencyState public emergencyState;
    
    /// @notice QuickSwap router interface
    IQuickSwapRouter public quickSwapRouter;
    
    /// @notice Standard CLOB interface
    IStandardCLOB public standardCLOB;
    
    /// @notice Authorized agents for autonomous execution
    mapping(address => bool) public authorizedAgents;
    
    /// @notice Arbitrage execution history
    ArbitrageExecution[] public arbitrageHistory;
    
    /// @notice Risk management parameters
    RiskParameters public riskParams;

    /*//////////////////////////////////////////////////////////////
                              STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct VaultConfig {
        uint256 managementFee;     // Annual management fee in basis points
        uint256 performanceFee;    // Performance fee in basis points
        uint256 minProfitThreshold; // Minimum profit threshold in basis points
        uint256 maxSlippage;       // Maximum allowed slippage in basis points
        bool autoCompound;         // Auto-compound profits
        address feeRecipient;      // Fee recipient address
    }

    struct PerformanceMetrics {
        uint256 totalProfit;       // Total profit generated
        uint256 totalTrades;       // Total number of arbitrage trades
        uint256 successfulTrades;  // Number of successful trades
        uint256 totalVolume;       // Total volume traded
        uint256 lastProfitTimestamp; // Last profit generation timestamp
        uint256 sharpeRatio;       // Sharpe ratio (scaled by 1e18)
        uint256 maxDrawdown;       // Maximum drawdown experienced
    }

    struct EmergencyState {
        bool isEmergency;          // Emergency mode flag
        uint256 emergencyTimestamp; // When emergency was triggered
        address emergencyTrigger;   // Who triggered emergency
        string emergencyReason;     // Reason for emergency
    }

    struct ArbitrageExecution {
        uint256 timestamp;         // Execution timestamp
        address tokenA;            // First token in arbitrage
        address tokenB;            // Second token in arbitrage
        uint256 amountIn;          // Input amount
        uint256 profitGenerated;   // Profit from arbitrage
        Platform buyPlatform;      // Platform where token was bought
        Platform sellPlatform;     // Platform where token was sold
        uint256 gasUsed;           // Gas used for execution
        bool successful;           // Whether execution was successful
    }

    struct RiskParameters {
        uint256 maxPositionSize;   // Maximum position size per trade
        uint256 maxDailyVolume;    // Maximum daily trading volume
        uint256 exposureLimit;     // Maximum exposure per token
        uint256 cooldownPeriod;    // Cooldown between trades
        mapping(address => uint256) lastTradeTimestamp; // Last trade per token
        mapping(address => uint256) dailyVolume; // Daily volume per token
        mapping(address => uint256) lastVolumeReset; // Last volume reset timestamp
    }

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    event ProfitDistributed(
        address indexed token,
        uint256 totalProfit,
        uint256 managementFee,
        uint256 performanceFee,
        uint256 userShare
    );

    event ConfigUpdated(
        uint256 managementFee,
        uint256 performanceFee,
        uint256 minProfitThreshold,
        uint256 maxSlippage
    );

    event AgentAuthorized(address indexed agent, bool authorized);

    event EmergencyTriggered(
        address indexed trigger,
        string reason,
        uint256 timestamp
    );

    event EmergencyResolved(uint256 timestamp);

    event RiskParametersUpdated(
        uint256 maxPositionSize,
        uint256 maxDailyVolume,
        uint256 exposureLimit,
        uint256 cooldownPeriod
    );

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender] || msg.sender == owner(), "Not authorized agent");
        _;
    }

    modifier notInEmergency() {
        require(!emergencyState.isEmergency, "Vault in emergency mode");
        _;
    }

    modifier validToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    modifier riskCheck(address token, uint256 amount) {
        _checkRiskParameters(token, amount);
        _;
    }

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _quickSwapRouter,
        address _standardCLOB,
        address _owner
    ) Ownable(_owner) {
        require(_quickSwapRouter != address(0), "Invalid router address");
        require(_standardCLOB != address(0), "Invalid CLOB address");
        require(_owner != address(0), "Invalid owner address");

        quickSwapRouter = IQuickSwapRouter(_quickSwapRouter);
        standardCLOB = IStandardCLOB(_standardCLOB);

        // Initialize default configuration
        config = VaultConfig({
            managementFee: 200,        // 2% annual
            performanceFee: 1000,      // 10% of profits
            minProfitThreshold: 50,    // 0.5%
            maxSlippage: 300,          // 3%
            autoCompound: true,
            feeRecipient: _owner
        });

        // Initialize risk parameters
        riskParams.maxPositionSize = 100000 * 1e18;  // 100k tokens
        riskParams.maxDailyVolume = 1000000 * 1e18;  // 1M tokens daily
        riskParams.exposureLimit = 50000 * 1e18;     // 50k tokens exposure
        riskParams.cooldownPeriod = 60;              // 1 minute cooldown

        emit ConfigUpdated(
            config.managementFee,
            config.performanceFee,
            config.minProfitThreshold,
            config.maxSlippage
        );
    }

    /*//////////////////////////////////////////////////////////////
                           DEPOSIT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deposit tokens into the vault
     * @param token Token address to deposit
     * @param amount Amount to deposit
     * @return shares Number of shares minted
     */
    function deposit(
        address token,
        uint256 amount
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        notInEmergency 
        validToken(token) 
        returns (uint256 shares) 
    {
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate shares based on current vault value
        shares = _calculateShares(token, amount);
        
        // Update user and total deposits
        userDeposits[msg.sender][token] += shares;
        totalDeposits[token] += amount;
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposit(msg.sender, token, amount, shares);
    }

    /**
     * @notice Withdraw tokens from the vault
     * @param token Token address to withdraw
     * @param shares Number of shares to redeem
     * @return amount Amount of tokens withdrawn
     */
    function withdraw(
        address token,
        uint256 shares
    ) 
        external 
        nonReentrant 
        validToken(token) 
        returns (uint256 amount) 
    {
        require(shares > 0, "Shares must be greater than 0");
        require(userDeposits[msg.sender][token] >= shares, "Insufficient shares");
        
        // Calculate withdrawal amount
        amount = _calculateWithdrawalAmount(token, shares);
        
        // Update balances
        userDeposits[msg.sender][token] -= shares;
        totalDeposits[token] -= amount;
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, token, amount, shares);
    }

    /*//////////////////////////////////////////////////////////////
                         ARBITRAGE EXECUTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Execute arbitrage between platforms
     * @param params Arbitrage execution parameters
     * @return profit Generated profit from arbitrage
     */
    function executeArbitrage(
        ArbitrageParams calldata params
    ) 
        external 
        onlyAuthorizedAgent 
        nonReentrant 
        whenNotPaused 
        notInEmergency
        riskCheck(params.tokenA, params.amountIn)
        returns (uint256 profit) 
    {
        require(params.expectedProfit >= config.minProfitThreshold, "Profit below threshold");
        require(params.slippage <= config.maxSlippage, "Slippage too high");
        
        uint256 initialBalance = _getTokenBalance(params.tokenB);
        
        // Execute the arbitrage trade
        _executeArbitrageTrade(params);
        
        uint256 finalBalance = _getTokenBalance(params.tokenB);
        profit = finalBalance - initialBalance;
        
        require(profit >= params.minProfit, "Insufficient profit generated");
        
        // Record execution
        _recordArbitrageExecution(params, profit, true);
        
        // Distribute profits
        _distributeProfits(params.tokenB, profit);
        
        emit ArbitrageExecuted(
            params.tokenA,
            params.tokenB,
            params.amountIn,
            profit,
            params.buyPlatform,
            params.sellPlatform,
            arbitrageHistory.length - 1
        );
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Update vault configuration
     * @param newConfig New configuration parameters
     */
    function updateConfig(VaultConfig calldata newConfig) external onlyOwner {
        require(newConfig.managementFee <= MAX_MANAGEMENT_FEE, "Management fee too high");
        require(newConfig.performanceFee <= MAX_PERFORMANCE_FEE, "Performance fee too high");
        require(newConfig.minProfitThreshold >= MIN_PROFIT_THRESHOLD, "Profit threshold too low");
        require(newConfig.maxSlippage <= MAX_SLIPPAGE, "Slippage too high");
        require(newConfig.feeRecipient != address(0), "Invalid fee recipient");
        
        config = newConfig;
        
        emit ConfigUpdated(
            newConfig.managementFee,
            newConfig.performanceFee,
            newConfig.minProfitThreshold,
            newConfig.maxSlippage
        );
    }

    /**
     * @notice Authorize or deauthorize an agent
     * @param agent Agent address
     * @param authorized Authorization status
     */
    function setAgentAuthorization(address agent, bool authorized) external onlyOwner {
        require(agent != address(0), "Invalid agent address");
        authorizedAgents[agent] = authorized;
        emit AgentAuthorized(agent, authorized);
    }

    /**
     * @notice Add or remove supported token
     * @param token Token address
     * @param supported Support status
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = supported;
    }

    /**
     * @notice Update risk parameters
     * @param params New risk parameters
     */
    function updateRiskParameters(RiskParametersInput calldata params) external onlyOwner {
        riskParams.maxPositionSize = params.maxPositionSize;
        riskParams.maxDailyVolume = params.maxDailyVolume;
        riskParams.exposureLimit = params.exposureLimit;
        riskParams.cooldownPeriod = params.cooldownPeriod;
        
        emit RiskParametersUpdated(
            params.maxPositionSize,
            params.maxDailyVolume,
            params.exposureLimit,
            params.cooldownPeriod
        );
    }

    /*//////////////////////////////////////////////////////////////
                         EMERGENCY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Trigger emergency mode
     * @param reason Reason for emergency
     */
    function triggerEmergency(string calldata reason) external onlyOwner {
        emergencyState = EmergencyState({
            isEmergency: true,
            emergencyTimestamp: block.timestamp,
            emergencyTrigger: msg.sender,
            emergencyReason: reason
        });
        
        _pause();
        
        emit EmergencyTriggered(msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Resolve emergency mode
     */
    function resolveEmergency() external onlyOwner {
        require(emergencyState.isEmergency, "No emergency to resolve");
        require(
            block.timestamp >= emergencyState.emergencyTimestamp + EMERGENCY_WINDOW,
            "Emergency window not elapsed"
        );
        
        emergencyState.isEmergency = false;
        _unpause();
        
        emit EmergencyResolved(block.timestamp);
    }

    /**
     * @notice Emergency withdrawal (only during emergency)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(emergencyState.isEmergency, "Not in emergency mode");
        IERC20(token).safeTransfer(owner(), amount);
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get user's share balance
     * @param user User address
     * @param token Token address
     * @return shares User's share balance
     */
    function getUserShares(address user, address token) external view returns (uint256) {
        return userDeposits[user][token];
    }

    /**
     * @notice Get user's token balance equivalent
     * @param user User address
     * @param token Token address
     * @return amount Token amount equivalent to user's shares
     */
    function getUserBalance(address user, address token) external view returns (uint256) {
        uint256 shares = userDeposits[user][token];
        return _calculateWithdrawalAmount(token, shares);
    }

    /**
     * @notice Get vault's total value
     * @param token Token address
     * @return value Total value in the vault for the token
     */
    function getTotalValue(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get arbitrage execution details
     * @param executionId Execution ID
     * @return execution Arbitrage execution details
     */
    function getArbitrageExecution(uint256 executionId) external view returns (ArbitrageExecution memory) {
        require(executionId < arbitrageHistory.length, "Invalid execution ID");
        return arbitrageHistory[executionId];
    }

    /**
     * @notice Get performance metrics
     * @return metrics Current performance metrics
     */
    function getPerformanceMetrics() external view returns (PerformanceMetrics memory) {
        return performance;
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate shares for deposit
     * @param token Token address
     * @param amount Deposit amount
     * @return shares Number of shares to mint
     */
    function _calculateShares(address token, uint256 amount) internal view returns (uint256 shares) {
        uint256 totalSupply = totalDeposits[token];
        uint256 totalValue = IERC20(token).balanceOf(address(this));
        
        if (totalSupply == 0 || totalValue == 0) {
            shares = amount;
        } else {
            shares = (amount * totalSupply) / totalValue;
        }
    }

    /**
     * @notice Calculate withdrawal amount
     * @param token Token address
     * @param shares Shares to redeem
     * @return amount Withdrawal amount
     */
    function _calculateWithdrawalAmount(address token, uint256 shares) internal view returns (uint256) {
        uint256 totalSupply = totalDeposits[token];
        uint256 totalValue = IERC20(token).balanceOf(address(this));
        
        if (totalSupply == 0) return 0;
        
        return (shares * totalValue) / totalSupply;
    }

    /**
     * @notice Execute arbitrage trade
     * @param params Arbitrage parameters
     */
    function _executeArbitrageTrade(ArbitrageParams calldata params) internal {
        if (params.buyPlatform == Platform.QUICKSWAP && params.sellPlatform == Platform.STANDARD) {
            _executeQuickSwapToStandard(params);
        } else if (params.buyPlatform == Platform.STANDARD && params.sellPlatform == Platform.QUICKSWAP) {
            _executeStandardToQuickSwap(params);
        } else {
            revert("Invalid platform combination");
        }
    }

    /**
     * @notice Execute QuickSwap to Standard arbitrage
     * @param params Arbitrage parameters
     */
    function _executeQuickSwapToStandard(ArbitrageParams calldata params) internal {
        // Buy on QuickSwap
        address[] memory path = new address[](2);
        path[0] = params.tokenA;
        path[1] = params.tokenB;
        
        IERC20(params.tokenA).safeIncreaseAllowance(address(quickSwapRouter), params.amountIn);
        
        quickSwapRouter.swapExactTokensForTokens(
            params.amountIn,
            params.minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        // Sell on Standard
        uint256 tokenBBalance = IERC20(params.tokenB).balanceOf(address(this));
        IERC20(params.tokenB).safeIncreaseAllowance(address(standardCLOB), tokenBBalance);
        standardCLOB.sellTokens(params.tokenB, params.tokenA, tokenBBalance, params.minAmountOut);
    }

    /**
     * @notice Execute Standard to QuickSwap arbitrage
     * @param params Arbitrage parameters
     */
    function _executeStandardToQuickSwap(ArbitrageParams calldata params) internal {
        // Buy on Standard
        IERC20(params.tokenA).safeIncreaseAllowance(address(standardCLOB), params.amountIn);
        standardCLOB.buyTokens(params.tokenA, params.tokenB, params.amountIn, params.minAmountOut);
        
        // Sell on QuickSwap
        address[] memory path = new address[](2);
        path[0] = params.tokenB;
        path[1] = params.tokenA;
        
        uint256 tokenBBalance = IERC20(params.tokenB).balanceOf(address(this));
        IERC20(params.tokenB).safeIncreaseAllowance(address(quickSwapRouter), tokenBBalance);
        
        quickSwapRouter.swapExactTokensForTokens(
            tokenBBalance,
            params.minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
    }

    /**
     * @notice Record arbitrage execution
     * @param params Arbitrage parameters
     * @param profit Generated profit
     * @param successful Whether execution was successful
     */
    function _recordArbitrageExecution(
        ArbitrageParams calldata params,
        uint256 profit,
        bool successful
    ) internal {
        arbitrageHistory.push(ArbitrageExecution({
            timestamp: block.timestamp,
            tokenA: params.tokenA,
            tokenB: params.tokenB,
            amountIn: params.amountIn,
            profitGenerated: profit,
            buyPlatform: params.buyPlatform,
            sellPlatform: params.sellPlatform,
            gasUsed: gasleft(),
            successful: successful
        }));
        
        // Update performance metrics
        performance.totalTrades++;
        if (successful) {
            performance.successfulTrades++;
            performance.totalProfit += profit;
            performance.totalVolume += params.amountIn;
            performance.lastProfitTimestamp = block.timestamp;
        }
    }

    /**
     * @notice Distribute profits to stakeholders
     * @param token Token address
     * @param profit Total profit amount
     */
    function _distributeProfits(address token, uint256 profit) internal {
        uint256 managementFee = (profit * config.managementFee) / MAX_BPS;
        uint256 performanceFee = (profit * config.performanceFee) / MAX_BPS;
        uint256 totalFees = managementFee + performanceFee;
        uint256 userShare = profit - totalFees;
        
        // Transfer fees to fee recipient
        if (totalFees > 0) {
            IERC20(token).safeTransfer(config.feeRecipient, totalFees);
        }
        
        // The remaining profit stays in the vault for auto-compounding
        
        emit ProfitDistributed(token, profit, managementFee, performanceFee, userShare);
    }

    /**
     * @notice Check risk parameters before trade execution
     * @param token Token address
     * @param amount Trade amount
     */
    function _checkRiskParameters(address token, uint256 amount) internal {
        require(amount <= riskParams.maxPositionSize, "Position size too large");
        
        // Check cooldown period
        require(
            block.timestamp >= riskParams.lastTradeTimestamp[token] + riskParams.cooldownPeriod,
            "Cooldown period not elapsed"
        );
        
        // Reset daily volume if needed
        if (block.timestamp >= riskParams.lastVolumeReset[token] + 1 days) {
            riskParams.dailyVolume[token] = 0;
            riskParams.lastVolumeReset[token] = block.timestamp;
        }
        
        // Check daily volume limit
        require(
            riskParams.dailyVolume[token] + amount <= riskParams.maxDailyVolume,
            "Daily volume limit exceeded"
        );
        
        // Update risk tracking
        riskParams.lastTradeTimestamp[token] = block.timestamp;
        riskParams.dailyVolume[token] += amount;
    }

    /**
     * @notice Get token balance
     * @param token Token address
     * @return balance Token balance
     */
    function _getTokenBalance(address token) internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}