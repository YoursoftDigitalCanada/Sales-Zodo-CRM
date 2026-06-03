jest.mock('../../src/modules/chat/chat.repository', () => ({
  chatRepository: {
    listDirectory: jest.fn(),
  },
}));

import { chatRepository } from '../../src/modules/chat/chat.repository';
import { chatService } from '../../src/modules/chat/chat.service';

describe('chat.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the chat directory through chat permissions without requiring employee module access', async () => {
    const directory = [
      {
        id: 'employee-2',
        user: { email: 'teammate@example.com' },
      },
    ];

    (chatRepository.listDirectory as jest.Mock).mockResolvedValue(directory);

    await expect(chatService.getDirectory('tenant-1', 'employee-1')).resolves.toBe(directory);
    expect(chatRepository.listDirectory).toHaveBeenCalledWith('tenant-1', 'employee-1');
  });
});
