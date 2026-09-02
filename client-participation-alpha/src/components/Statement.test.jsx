import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Statement } from './Statement'

const s = { agree: 'Agree', disagree: 'Disagree', pass: 'Pass', voting: 'Voting...' }

const statement = { tid: 42, txt: 'A test statement', remaining: 3 }

function renderStatement(props = {}) {
  const onVote = jest.fn()
  const setIsStatmentImportant = jest.fn()
  const utils = render(
    <Statement
      statement={statement}
      onVote={onVote}
      isVoting={false}
      s={s}
      isStatementImportant={false}
      setIsStatmentImportant={setIsStatmentImportant}
      voteError={null}
      {...props}
    />
  )
  return { ...utils, onVote }
}

describe('Statement vote buttons', () => {
  it('are enabled and show their labels when not voting', () => {
    renderStatement()

    expect(screen.getByText(/Agree/)).not.toBeDisabled()
    expect(screen.getByText(/Disagree/)).not.toBeDisabled()
    expect(screen.getByText('Pass')).not.toBeDisabled()
  })

  it('calls onVote with the vote type and statement tid when clicked', () => {
    const { onVote } = renderStatement()

    fireEvent.click(screen.getByText(/Agree/))

    expect(onVote).toHaveBeenCalledWith(-1, statement.tid)
  })

  it('ignores clicks while a vote is already in flight', () => {
    const { onVote } = renderStatement({ isVoting: true })

    fireEvent.click(screen.getAllByRole('button')[0])

    expect(onVote).not.toHaveBeenCalled()
  })

  it('shows a spinner only on the clicked button while voting, and disables all three', () => {
    const onVote = jest.fn()
    const setIsStatmentImportant = jest.fn()

    const { rerender } = render(
      <Statement
        statement={statement}
        onVote={onVote}
        isVoting={false}
        s={s}
        isStatementImportant={false}
        setIsStatmentImportant={setIsStatmentImportant}
        voteError={null}
      />
    )

    // Click "Agree" (voteType -1), then simulate the parent re-rendering
    // with isVoting=true once the request is in flight.
    fireEvent.click(screen.getByText(/Agree/))
    rerender(
      <Statement
        statement={statement}
        onVote={onVote}
        isVoting={true}
        s={s}
        isStatementImportant={false}
        setIsStatmentImportant={setIsStatmentImportant}
        voteError={null}
      />
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => expect(button).toBeDisabled())

    const agreeButton = document.querySelector('.vote-button.agree')
    const disagreeButton = document.querySelector('.vote-button.disagree')
    const passButton = document.querySelector('.vote-button.pass')

    expect(agreeButton.querySelector('.vote-spinner')).toBeInTheDocument()
    expect(disagreeButton.querySelector('.vote-spinner')).not.toBeInTheDocument()
    expect(passButton.querySelector('.vote-spinner')).not.toBeInTheDocument()

    // Once the parent flips isVoting back to false (vote resolved), buttons
    // re-enable and go back to showing their labels, not spinners.
    rerender(
      <Statement
        statement={statement}
        onVote={onVote}
        isVoting={false}
        s={s}
        isStatementImportant={false}
        setIsStatmentImportant={setIsStatmentImportant}
        voteError={null}
      />
    )

    expect(agreeButton.querySelector('.vote-spinner')).not.toBeInTheDocument()
    expect(agreeButton).not.toBeDisabled()
  })

  it('shows the voteError message when present', () => {
    renderStatement({ voteError: 'Something went wrong' })

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
