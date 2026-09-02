import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ConversationApp from './ConversationApp'
import PolisNet from '../lib/net'

jest.mock('../lib/net', () => ({
  __esModule: true,
  default: { polisGet: jest.fn() }
}))

// These children pull in browser-only/visualization behavior that isn't
// relevant to ConversationApp's own loading/error/data-fetch logic.
jest.mock('./TreeviteLoginCodeModal.jsx', () => () => <div data-testid="login-modal" />)
jest.mock('./topicAgenda/TopicAgenda.jsx', () => () => <div data-testid="topic-agenda" />)
jest.mock('./Survey.jsx', () => () => <div data-testid="survey" />)
jest.mock('./SurveyForm.jsx', () => () => <div data-testid="survey-form" />)
jest.mock('./TreeviteInvites.jsx', () => () => <div data-testid="treevite-invites" />)
jest.mock('./VisualizationContainer', () => () => <div data-testid="visualization" />)

const s = { loadingConversation: 'Loading conversation...', participantHelpWelcomeText: 'Welcome' }

const baseConversationData = {
  conversation: {
    conversation_id: 'abc123',
    topic: 'Test Topic',
    description: 'A description',
    treevite_enabled: false,
    is_active: true,
    vis_type: 0,
  },
  nextComment: { tid: 1, txt: 'First statement', remaining: 5 },
}

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => {
  PolisNet.polisGet.mockReset()
})

describe('ConversationApp', () => {
  it('shows a branded loading state immediately, before the fetch resolves', async () => {
    const { promise } = deferred()
    PolisNet.polisGet.mockReturnValue(promise)

    render(<ConversationApp conversation_id="abc123" s={s} />)

    expect(screen.getByText('Loading conversation...')).toBeInTheDocument()
    expect(screen.queryByTestId('survey')).not.toBeInTheDocument()
  })

  it('renders the conversation once the fetch resolves', async () => {
    PolisNet.polisGet.mockResolvedValue(baseConversationData)

    render(<ConversationApp conversation_id="abc123" s={s} />)

    await waitFor(() => expect(screen.getByText('Test Topic')).toBeInTheDocument())

    expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
    expect(screen.getByTestId('survey')).toBeInTheDocument()
    expect(screen.getByTestId('survey-form')).toBeInTheDocument()
    expect(screen.getByTestId('topic-agenda')).toBeInTheDocument()
  })

  it('shows the closed badge and hides survey/topic-agenda for an inactive conversation', async () => {
    PolisNet.polisGet.mockResolvedValue({
      ...baseConversationData,
      conversation: { ...baseConversationData.conversation, is_active: false },
    })

    render(<ConversationApp conversation_id="abc123" s={s} />)

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument())
    expect(screen.queryByTestId('survey')).not.toBeInTheDocument()
  })

  it('shows a generic error message when the fetch fails', async () => {
    PolisNet.polisGet.mockRejectedValue(new Error('network down'))

    render(<ConversationApp conversation_id="abc123" s={s} />)

    await waitFor(() => expect(screen.getByText('Oops!')).toBeInTheDocument())
    expect(screen.getByText(/Could not load this conversation/)).toBeInTheDocument()
  })

  it('shows the xid-required message when the API reports polis_err_xid_required', async () => {
    const error = new Error('Polis API Error')
    error.responseText = 'polis_err_xid_required'
    PolisNet.polisGet.mockRejectedValue(error)

    render(<ConversationApp conversation_id="abc123" s={{ ...s, xidRequired: 'Need an XID' }} />)

    await waitFor(() => expect(screen.getByText('Need an XID')).toBeInTheDocument())
  })
})
