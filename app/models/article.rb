class Article < ActiveRecord::Base
  has_many :comments, dependent: :destroy
  validates :title, presence: true,
                    length: { minimum: 5 }

  before_save :tokenize_html

  def tokenize_html
    self[:text] = PParser::tokenize_html(self[:text])
  end
end