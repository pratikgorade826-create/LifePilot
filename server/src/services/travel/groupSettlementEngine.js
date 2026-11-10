/**
 * Group Settlement Engine
 * Calculates net member balances and produces simplified debt settlements
 * minimizing bilateral payment transactions.
 */
class GroupSettlementEngine {
  /**
   * Calculate group expenses, individual shares, net balances, and simplified settlements
   * @param {Array} expenses - Array of TripExpense objects
   * @param {Array} members - Array of trip member objects or user profiles
   */
  calculateSettlements(expenses = [], members = []) {
    const memberMap = new Map();

    // Initialize all members
    members.forEach(m => {
      const id = m.userId ? m.userId.toString() : (m._id ? m._id.toString() : m.name);
      memberMap.set(id, {
        userId: id,
        name: m.name || 'Member',
        email: m.email || '',
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0
      });
    });

    let totalGroupExpense = 0;
    const categoryTotals = {
      Transportation: 0,
      Accommodation: 0,
      Food: 0,
      Activities: 0,
      Shopping: 0,
      'Local Transport': 0,
      Emergency: 0,
      Miscellaneous: 0
    };

    // Process each expense
    expenses.forEach(exp => {
      const amount = Number(exp.amount) || 0;
      totalGroupExpense += amount;

      const cat = exp.category || 'Miscellaneous';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;

      // Register payer
      const payerId = exp.paidBy?.userId ? exp.paidBy.userId.toString() : (exp.paidBy?.userName || 'Unknown Payer');
      if (!memberMap.has(payerId)) {
        memberMap.set(payerId, {
          userId: payerId,
          name: exp.paidBy?.userName || 'Payer',
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0
        });
      }
      memberMap.get(payerId).totalPaid += amount;

      // Register participant shares
      const participants = Array.isArray(exp.participants) && exp.participants.length > 0
        ? exp.participants
        : [{ userId: payerId, userName: exp.paidBy?.userName || 'Payer', shareAmount: amount }];

      participants.forEach(p => {
        const participantId = p.userId ? p.userId.toString() : (p.userName || 'Unknown');
        if (!memberMap.has(participantId)) {
          memberMap.set(participantId, {
            userId: participantId,
            name: p.userName || 'Participant',
            totalPaid: 0,
            totalOwed: 0,
            netBalance: 0
          });
        }
        const share = Number(p.shareAmount) || 0;
        memberMap.get(participantId).totalOwed += share;
      });
    });

    // Compute net balance (positive = to receive, negative = owes)
    const balances = Array.from(memberMap.values()).map(m => {
      m.netBalance = Math.round(m.totalPaid - m.totalOwed);
      return m;
    });

    // Generate simplified debt settlements
    const settlements = this.computeSimplifiedTransfers(balances);

    return {
      totalGroupExpense,
      categoryTotals,
      memberBalances: balances,
      settlements,
      settlementCount: settlements.length,
      isFullySettled: settlements.length === 0
    };
  }

  /**
   * Greedy algorithm to minimize bilateral settlement transfers
   */
  computeSimplifiedTransfers(memberBalances) {
    // Separate into debtors (owes money: net < 0) and creditors (gets money: net > 0)
    const debtors = [];
    const creditors = [];

    memberBalances.forEach(m => {
      if (m.netBalance < -0.5) {
        debtors.push({ ...m, balance: -m.netBalance }); // positive debt amount
      } else if (m.netBalance > 0.5) {
        creditors.push({ ...m, balance: m.netBalance });
      }
    });

    // Sort descending by amount
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const transfers = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const paymentAmount = Math.min(debtor.balance, creditor.balance);

      if (paymentAmount > 0.5) {
        transfers.push({
          fromUserId: debtor.userId,
          fromName: debtor.name,
          toUserId: creditor.userId,
          toName: creditor.name,
          amount: Math.round(paymentAmount),
          currency: 'INR'
        });
      }

      debtor.balance -= paymentAmount;
      creditor.balance -= paymentAmount;

      if (debtor.balance < 0.5) i++;
      if (creditor.balance < 0.5) j++;
    }

    return transfers;
  }
}

module.exports = new GroupSettlementEngine();

