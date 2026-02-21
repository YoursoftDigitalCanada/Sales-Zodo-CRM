"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toExpenseResponseDto = toExpenseResponseDto;
function toExpenseResponseDto(exp) {
    let clientDisplayName;
    if (exp.client) {
        clientDisplayName = exp.client.clientType === 'COMPANY' ? exp.client.companyName || 'Company' : `${exp.client.firstName || ''} ${exp.client.lastName || ''}`.trim();
    }
    return {
        id: exp.id,
        category: exp.category,
        description: exp.description,
        amount: Number(exp.amount),
        currency: exp.currency,
        expenseDate: exp.expenseDate,
        status: exp.status,
        receipt: exp.receipt,
        notes: exp.notes,
        submittedBy: exp.submittedBy ? { id: exp.submittedBy.id, firstName: exp.submittedBy.user.firstName, lastName: exp.submittedBy.user.lastName } : null,
        project: exp.project ? { id: exp.project.id, name: exp.project.name } : null,
        client: exp.client ? { id: exp.client.id, displayName: clientDisplayName } : null,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt,
    };
}
//# sourceMappingURL=expenses.dto.js.map